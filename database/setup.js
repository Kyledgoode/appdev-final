const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Database connection
const dbName =
    process.env.NODE_ENV === 'test'
        ? 'test_satisfactory_inventory.db'
        : (process.env.DB_NAME || 'satisfactory_inventory.db');

const db = new Sequelize({
    dialect: process.env.DB_TYPE || 'sqlite',
    storage: `database/${dbName}`,
    logging: false
});

// User stores information for API users
const User = db.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'player',
        validate: {
            isIn: [['player', 'admin']]
        }
    }
});


// Factory stores information for each Satisfactory factory in the game
const Factory = db.define('Factory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
    },
    powerUsage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'inactive']]
        }
    }
});

// Resource stores information for the resources in each factory in the game
const Resource = db.define('Resource', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantityStored: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
});

//Relationships
User.hasMany(Factory, { foreignKey: 'userId', onDelete: 'CASCADE' });
Factory.belongsTo(User, { foreignKey: 'userId' });

Factory.hasMany(Resource, { foreignKey: 'factoryId', onDelete: 'CASCADE' });
Resource.belongsTo(Factory, { foreignKey: 'factoryId' });

// Initializing database
async function initializeDatabase() {
    try {
        await db.authenticate();
        console.log('Database connection established successfully.');

        await db.sync({ force: false });
        console.log('Database synchronized successfully.');
    } catch (error) {
        console.error('Unable to connect to database:', error);
    }
}

initializeDatabase();

module.exports = {
    db,
    User,
    Factory,
    Resource
};