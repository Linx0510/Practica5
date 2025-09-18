const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
});
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const User = sequelize.define('User', {
    id_user: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    first_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        }
    }
});


const Tarif = sequelize.define('Tarif', {
    id_tarif: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    minutes: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    gb: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
});

const SocialStatus = sequelize.define('SocialStatus', {
    id_socialStatus: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    discount: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0
    }
});

const Apay = sequelize.define('Apay', {
    id_apay: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    }
});



User.belongsTo(SocialStatus, { foreignKey: 'id_socialStatus' });
SocialStatus.hasMany(User, { foreignKey: 'id_socialStatus' });

User.belongsTo(Tarif, { foreignKey: 'id_tarif' });
Tarif.hasMany(User, { foreignKey: 'id_tarif' });

Apay.belongsTo(User, { foreignKey: 'id_user' });
User.hasMany(Apay, { foreignKey: 'id_user' });


app.get('/', async (req, res) => {
    try {
        const users = await User.findAll({
            include: [SocialStatus, Tarif, Apay ]
        });
        res.render('index', { users });
    } catch (error) {
        console.error('Ошибка при получении пользователей:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

app.get('/add-social-status', (req, res) => {
    res.render('add-social-status');
});

app.get('/add-tarif', (req, res) => {
    res.render('add-tarif');
});


app.get('/add-user', async (req, res) => {
    try {
        const socialStatuses = await SocialStatus.findAll();
        const tarifs = await Tarif.findAll();
        res.render('add-user', { socialStatuses, tarifs });
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

app.get('/add-apay/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findByPk(userId);
        res.render('add-apay', { user }); 
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

app.get('/edit-user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId, {
            include: [SocialStatus, Tarif]
        });
        if (!user) {
            return res.status(404).send('Пользователь не найден');
        }
        const socialStatuses = await SocialStatus.findAll();
        const tarifs = await Tarif.findAll();
        res.render('edit-user', { user, socialStatuses, tarifs });
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

app.post('/add-social-status', async (req, res) => {
    const { name, discount } = req.body;
    if (name) {
        await SocialStatus.create({ name, discount: parseFloat(discount) || 0.0 });
    }
    res.redirect('/');
});

app.post('/add-tarif', async (req, res) => {
    const { name, price, minutes, gb } = req.body;
    if (name && price && minutes && gb) {
        await Tarif.create({
            name,
            price: parseFloat(price),
            minutes: parseInt(minutes),
            gb: parseInt(gb)
        });
    }
    res.redirect('/');
});



app.post('/add-user', async (req, res) => {
    const { first_name, last_name, phone, email, id_socialStatus, id_tarif } = req.body;

    if (first_name && last_name && phone && id_socialStatus && id_tarif) {
        try {
            await User.create({
                first_name,
                last_name,
                phone,
                email: email || null,
                id_socialStatus: parseInt(id_socialStatus),
                id_tarif: parseInt(id_tarif)
            });
            res.redirect('/');
        } catch (error) {
            console.error('Ошибка добавления пользователя:', error);
            res.status(500).send('Внутренняя ошибка сервера');
        }
    } else {
        res.status(400).send('Все обязательные поля должны быть заполнены');
    }
});

app.post('/add-apay/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { price, id_dayweek } = req.body;

        if (price && id_dayweek) {
            await Apay.create({
                price: parseFloat(price),
                id_user: parseInt(userId),
            });
        }
        res.redirect('/');
    } catch (error) {
        console.error('Ошибка добавления абонентской платы:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

app.post('/delete-user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        await User.destroy({
            where: { id_user: userId },
        });
        res.redirect('/');
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

app.post('/edit-user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { first_name, last_name, phone, email, id_socialStatus, id_tarif } = req.body;

        await User.update(
            {
                first_name,
                last_name,
                phone,
                email: email || null,
                id_socialStatus: parseInt(id_socialStatus),
                id_tarif: parseInt(id_tarif)
            },
            { where: { id_user: userId } }
        );
        res.redirect('/');
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});


(async () => {
    try {
        await sequelize.sync({ force: true });

        const socialStatus1 = await SocialStatus.create({ name: 'Стандарт', discount: 0.0 });
        const socialStatus2 = await SocialStatus.create({ name: 'Студент', discount: 15.0 });
        const socialStatus3 = await SocialStatus.create({ name: 'Пенсионер', discount: 20.0 });

        const tarif1 = await Tarif.create({ name: 'Базовый', price: 300.0, minutes: 200, gb: 5 });
        const tarif2 = await Tarif.create({ name: 'Стандарт', price: 500.0, minutes: 500, gb: 15 });
        const tarif3 = await Tarif.create({ name: 'Премиум', price: 1000.0, minutes: 1000, gb: 30 });


        const user1 = await User.create({
            first_name: 'Лиана',
            last_name: 'Сисенова',
            phone: '+79878721968',
            email: 'Linx05@yandex.ru',
            id_socialStatus: socialStatus2.id_socialStatus,
            id_tarif: tarif1.id_tarif
        });

        const user2 = await User.create({
            first_name: 'Дарина',
            last_name: 'Сапрыкина',
            phone: '+79169876543',
            email: 'DarinaSap@gmail.com',
            id_socialStatus: socialStatus1.id_socialStatus,
            id_tarif: tarif2.id_tarif
        });
        const user3 = await User.create({
            first_name: 'Игорь',
            last_name: 'Ботвиновский',
            phone: '+79189513485',
            email: 'IgorBotp@gmail.com',
            id_socialStatus: socialStatus3.id_socialStatus,
            id_tarif: tarif2.id_tarif
        });

        await Apay.create({ price: 300.0, id_user: user1.id_user});
        await Apay.create({ price: 500.0, id_user: user2.id_user});

        app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
    }
})();