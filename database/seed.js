const { db, User, Factory, Resource } = require('./setup');

async function seedDatabase() {
    try {
        // Reset database
        await db.sync({ force: true });
        console.log('Database reset successfully.');

        // Create sample users
        const users = await User.bulkCreate([
            {
                name: 'Kyle',
                email: 'kyle@satisfactory.com'
            },
            {
                name: 'Player2',
                email: 'player2@satisfactory.com'
            }
        ]);

        // Create sample factories
        const factories = await Factory.bulkCreate([
            {
                name: 'Iron Ingot Factory',
                location: 'Grass Fields',
                powerUsage: 120,
                status: 'active',
                userId: users[0].id
            },
            {
                name: 'Copper Ingot Factory',
                location: 'Rocky Desert',
                powerUsage: 240,
                status: 'active',
                userId: users[1].id
            }
        ]);

        // Create sample resources
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
        console.log('Sample users created:');
        console.log('- kyle@satisfactory.com');
        console.log('- player2@satisfactory.com');
        console.log('Sample factories and resources created.');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await db.close();
    }
}

seedDatabase();