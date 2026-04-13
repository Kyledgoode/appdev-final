process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('./server');
const { db, User, Factory, Resource } = require('./database/setup');

beforeAll(async () => {
    await db.sync({ force: true });

    const users = await User.bulkCreate([
        { name: 'Kyle', email: 'kyle@satisfactory.com' },
        { name: 'Player2', email: 'player2@satisfactory.com' }
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
});

afterAll(async () => {
    await db.close();
});

describe('Users API', () => {
    test('GET /users should return all users', async () => {
        const res = await request(app).get('/users');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('POST /users should create a new user', async () => {
        const res = await request(app)
            .post('/users')
            .send({
                name: 'NewUser',
                email: 'newuser@satisfactory.com'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('NewUser');
        expect(res.body.email).toBe('newuser@satisfactory.com');
    });

    test('POST /users should return 400 if name or email is missing', async () => {
        const res = await request(app)
            .post('/users')
            .send({
                name: 'IncompleteUser'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('DELETE /users/:id should delete a user', async () => {
        const user = await User.create({
            name: 'DeleteMe',
            email: 'deleteme@satisfactory.com'
        });

        const res = await request(app).delete(`/users/${user.id}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('User deleted successfully');
    });
});

describe('Items API', () => {
    test('GET /items should return all items', async () => {
        const res = await request(app).get('/items');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('POST /items should create a new item', async () => {
        const factory = await Factory.findOne();

        const res = await request(app)
            .post('/items')
            .send({
                name: 'Screw',
                category: 'component',
                quantityStored: 300,
                factoryId: factory.id
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('Screw');
        expect(res.body.category).toBe('component');
    });

    test('POST /items should return 400 for invalid factoryId', async () => {
        const res = await request(app)
            .post('/items')
            .send({
                name: 'Bad Item',
                category: 'raw',
                quantityStored: 50,
                factoryId: 9999
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('PUT /items/:id should update an item', async () => {
        const item = await Resource.create({
            name: 'Iron Rod',
            category: 'component',
            quantityStored: 100,
            factoryId: 1
        });

        const res = await request(app)
            .put(`/items/${item.id}`)
            .send({
                quantityStored: 250
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.quantityStored).toBe(250);
    });
});

describe('Inventories API', () => {
    test('GET /inventories should return all inventories', async () => {
        const res = await request(app).get('/inventories');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('POST /inventories should create a new inventory', async () => {
        const user = await User.findOne();

        const res = await request(app)
            .post('/inventories')
            .send({
                name: 'Steel Factory',
                location: 'Northern Forest',
                powerUsage: 300,
                status: 'active',
                userId: user.id
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('Steel Factory');
        expect(res.body.location).toBe('Northern Forest');
    });

    test('POST /inventories should return 400 for invalid userId', async () => {
        const res = await request(app)
            .post('/inventories')
            .send({
                name: 'Broken Factory',
                location: 'Dune Desert',
                powerUsage: 100,
                status: 'active',
                userId: 9999
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('DELETE /inventories/:id should delete an inventory', async () => {
        const user = await User.findOne();

        const inventory = await Factory.create({
            name: 'Temporary Factory',
            location: 'Grass Fields',
            powerUsage: 50,
            status: 'active',
            userId: user.id
        });

        const res = await request(app).delete(`/inventories/${inventory.id}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Inventory deleted successfully');
    });
});