const bcrypt = require('bcryptjs');
const { db, User, Factory, Resource } = require('./setup');

async function seedDatabase() {
    try {
        await db.sync({ force: true });
        console.log('Database reset successfully.');

        const hashedPassword = await bcrypt.hash('password123', 10);

        const users = await User.bulkCreate([
            {
                name: 'Kyle',
                email: 'kyle@satisfactory.com',
                password: hashedPassword,
                role: 'player'
            },
            {
                name: 'AdminUser',
                email: 'admin@satisfactory.com',
                password: hashedPassword,
                role: 'admin'
            }
        ]);

        const factories = await Factory.bulkCreate([
            {
                name: 'Iron Ingot Factory',
                location: 'Grass Fields',
                powerUsage: 120,
                status: 'active',
                userId: users[0].id
            },
            {
                name: 'Copper Sheet Factory',
                location: 'Rocky Desert',
                powerUsage: 240,
                status: 'active',
                userId: users[1].id
            }
        ]);

        await Resource.bulkCreate([
            {
                name: 'Iron Ore',
                category: 'raw',
                quantityStored: 500,
                factoryId: factories[0].id
            },
            {
                name: 'Copper Ore',
                category: 'raw',
                quantityStored: 350,
                factoryId: factories[1].id
            },
            {
                name: 'Iron Ingot',
                category: 'refined',
                quantityStored: 200,
                factoryId: factories[0].id
            },
            {
                name: 'Copper Ingot',
                category: 'refined',
                quantityStored: 150,
                factoryId: factories[1].id
            }
        ]);

        console.log('Database seeded successfully!');
        console.log('- kyle@satisfactory.com / password123 / player');
        console.log('- admin@satisfactory.com / password123 / admin');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await db.close();
    }
}

seedDatabase();