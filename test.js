process.env.NODE_ENV = 'test';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('./server');
const { db, User, Factory, Resource } = require('./database/setup');

let playerToken;
let adminToken;
let playerUser;
let adminUser;
let firstFactory;

beforeAll(async () => {
    await db.sync({ force: true });

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

    playerUser = users[0];
    adminUser = users[1];

    const factories = await Factory.bulkCreate([
        {
            name: 'Iron Ingot Factory',
            location: 'Grass Fields',
            powerUsage: 120,
            status: 'active',
            userId: playerUser.id
        },
        {
            name: 'Copper Sheet Factory',
            location: 'Rocky Desert',
            powerUsage: 240,
            status: 'active',
            userId: adminUser.id
        }
    ]);

    firstFactory = factories[0];

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

    const playerLogin = await request(app)
        .post('/auth/login')
        .send({
            email: 'kyle@satisfactory.com',
            password: 'password123'
        });

    playerToken = playerLogin.body.token;

    const adminLogin = await request(app)
        .post('/auth/login')
        .send({
            email: 'admin@satisfactory.com',
            password: 'password123'
        });

    adminToken = adminLogin.body.token;
});

afterAll(async () => {
    await db.close();
});

describe('Authentication API', () => {
    test('POST /auth/register should create a new player user', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({
                name: 'NewPlayer',
                email: 'newplayer@satisfactory.com',
                password: 'password123'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('User registered successfully');
        expect(res.body.user.name).toBe('NewPlayer');
        expect(res.body.user.email).toBe('newplayer@satisfactory.com');
        expect(res.body.user.role).toBe('player');
    });

    test('POST /auth/register should return 400 if fields are missing', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({
                name: 'IncompleteUser',
                email: 'incomplete@satisfactory.com'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('POST /auth/login should return a token for valid credentials', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'kyle@satisfactory.com',
                password: 'password123'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Login successful');
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('kyle@satisfactory.com');
    });

    test('POST /auth/login should return 401 for invalid password', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'kyle@satisfactory.com',
                password: 'wrongpassword'
            });

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Invalid email or password');
    });
});

describe('Users API', () => {
    test('GET /users should return 401 without a token', async () => {
        const res = await request(app).get('/users');

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBeDefined();
    });

    test('GET /users should return 403 for a non-admin user', async () => {
        const res = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${playerToken}`);

        expect(res.statusCode).toBe(403);
        expect(res.body.error).toBe('Admin access required');
    });

    test('GET /users should return all users for an admin', async () => {
        const res = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('DELETE /users/:id should delete a user for an admin', async () => {
        const hashedPassword = await bcrypt.hash('password123', 10);

        const user = await User.create({
            name: 'DeleteMe',
            email: 'deleteme@satisfactory.com',
            password: hashedPassword,
            role: 'player'
        });

        const res = await request(app)
            .delete(`/users/${user.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

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

    test('POST /items should return 401 without a token', async () => {
        const res = await request(app)
            .post('/items')
            .send({
                name: 'Screw',
                category: 'component',
                quantityStored: 300,
                factoryId: firstFactory.id
            });

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBeDefined();
    });

    test('POST /items should create a new item with auth', async () => {
        const res = await request(app)
            .post('/items')
            .set('Authorization', `Bearer ${playerToken}`)
            .send({
                name: 'Screw',
                category: 'component',
                quantityStored: 300,
                factoryId: firstFactory.id
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('Screw');
        expect(res.body.category).toBe('component');
    });

    test('POST /items should return 400 for invalid factoryId', async () => {
        const res = await request(app)
            .post('/items')
            .set('Authorization', `Bearer ${playerToken}`)
            .send({
                name: 'Bad Item',
                category: 'raw',
                quantityStored: 50,
                factoryId: 9999
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('PUT /items/:id should update an item with auth', async () => {
        const item = await Resource.create({
            name: 'Iron Rod',
            category: 'component',
            quantityStored: 100,
            factoryId: firstFactory.id
        });

        const res = await request(app)
            .put(`/items/${item.id}`)
            .set('Authorization', `Bearer ${playerToken}`)
            .send({
                quantityStored: 250
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.quantityStored).toBe(250);
    });

    test('DELETE /items/:id should delete an item with auth', async () => {
        const item = await Resource.create({
            name: 'Cable',
            category: 'component',
            quantityStored: 75,
            factoryId: firstFactory.id
        });

        const res = await request(app)
            .delete(`/items/${item.id}`)
            .set('Authorization', `Bearer ${playerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Item deleted successfully');
    });
});

describe('Inventories API', () => {
    test('GET /inventories should return all inventories', async () => {
        const res = await request(app).get('/inventories');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('POST /inventories should return 401 without a token', async () => {
        const res = await request(app)
            .post('/inventories')
            .send({
                name: 'Steel Factory',
                location: 'Northern Forest',
                powerUsage: 300,
                status: 'active',
                userId: playerUser.id
            });

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBeDefined();
    });

    test('POST /inventories should create a new inventory with auth', async () => {
        const res = await request(app)
            .post('/inventories')
            .set('Authorization', `Bearer ${playerToken}`)
            .send({
                name: 'Steel Factory',
                location: 'Northern Forest',
                powerUsage: 300,
                status: 'active',
                userId: playerUser.id
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('Steel Factory');
        expect(res.body.location).toBe('Northern Forest');
    });

    test('POST /inventories should return 400 for invalid userId', async () => {
        const res = await request(app)
            .post('/inventories')
            .set('Authorization', `Bearer ${playerToken}`)
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

    test('DELETE /inventories/:id should delete an inventory with auth', async () => {
        const inventory = await Factory.create({
            name: 'Temporary Factory',
            location: 'Grass Fields',
            powerUsage: 50,
            status: 'active',
            userId: playerUser.id
        });

        const res = await request(app)
            .delete(`/inventories/${inventory.id}`)
            .set('Authorization', `Bearer ${playerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Inventory deleted successfully');
    });
});