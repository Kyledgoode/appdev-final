const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, User, Factory, Resource } = require('./database/setup');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

async function testConnection() {
    try {
        await db.authenticate();
        console.log('Connection to database established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id,
            name: decoded.name,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid or expired token'
        });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required'
        });
    }

    next();
}

app.get('/', (req, res) => {
    res.json({ message: 'Satisfactory Resource Inventory API is running.' });
});

// AUTH

app.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'name, email, and password are required'
            });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'player'
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'email and password are required'
            });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// USERS

app.get('/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role'],
            include: [{ model: Factory }]
        });

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const deletedRowsCount = await User.destroy({
            where: { id: req.params.id }
        });

        if (deletedRowsCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ITEMS

app.get('/items', async (req, res) => {
    try {
        const items = await Resource.findAll({
            include: [
                {
                    model: Factory,
                    attributes: ['id', 'name', 'location']
                }
            ]
        });

        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

app.get('/items/:id', async (req, res) => {
    try {
        const item = await Resource.findByPk(req.params.id, {
            include: [
                {
                    model: Factory,
                    attributes: ['id', 'name', 'location']
                }
            ]
        });

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json(item);
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

app.post('/items', requireAuth, async (req, res) => {
    try {
        const { name, category, quantityStored, factoryId } = req.body;

        if (!name || !category || factoryId == null) {
            return res.status(400).json({
                error: 'name, category, and factoryId are required'
            });
        }

        const factory = await Factory.findByPk(factoryId);
        if (!factory) {
            return res.status(400).json({
                error: 'Invalid factoryId. Factory does not exist'
            });
        }

        const newItem = await Resource.create({
            name,
            category,
            quantityStored: quantityStored ?? 0,
            factoryId
        });

        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
});

app.put('/items/:id', requireAuth, async (req, res) => {
    try {
        const { name, category, quantityStored, factoryId } = req.body;

        const item = await Resource.findByPk(req.params.id);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        if (factoryId != null) {
            const factory = await Factory.findByPk(factoryId);
            if (!factory) {
                return res.status(400).json({
                    error: 'Invalid factoryId. Factory does not exist'
                });
            }
        }

        await item.update({
            name: name ?? item.name,
            category: category ?? item.category,
            quantityStored: quantityStored ?? item.quantityStored,
            factoryId: factoryId ?? item.factoryId
        });

        res.json(item);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

app.delete('/items/:id', requireAuth, async (req, res) => {
    try {
        const deletedRowsCount = await Resource.destroy({
            where: { id: req.params.id }
        });

        if (deletedRowsCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// INVENTORIES

app.get('/inventories', async (req, res) => {
    try {
        const inventories = await Factory.findAll({
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'email', 'role']
                },
                {
                    model: Resource
                }
            ]
        });

        res.json(inventories);
    } catch (error) {
        console.error('Error fetching inventories:', error);
        res.status(500).json({ error: 'Failed to fetch inventories' });
    }
});

app.get('/inventories/:id', async (req, res) => {
    try {
        const inventory = await Factory.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'email', 'role']
                },
                {
                    model: Resource
                }
            ]
        });

        if (!inventory) {
            return res.status(404).json({ error: 'Inventory not found' });
        }

        res.json(inventory);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

app.post('/inventories', requireAuth, async (req, res) => {
    try {
        const { name, location, powerUsage, status, userId } = req.body;

        if (!name || !location || userId == null) {
            return res.status(400).json({
                error: 'name, location, and userId are required'
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(400).json({
                error: 'Invalid userId. User does not exist'
            });
        }

        const newInventory = await Factory.create({
            name,
            location,
            powerUsage: powerUsage ?? 0,
            status: status ?? 'active',
            userId
        });

        res.status(201).json(newInventory);
    } catch (error) {
        console.error('Error creating inventory:', error);
        res.status(500).json({ error: 'Failed to create inventory' });
    }
});

app.put('/inventories/:id', requireAuth, async (req, res) => {
    try {
        const { name, location, powerUsage, status, userId } = req.body;

        const inventory = await Factory.findByPk(req.params.id);

        if (!inventory) {
            return res.status(404).json({ error: 'Inventory not found' });
        }

        if (userId != null) {
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(400).json({
                    error: 'Invalid userId. User does not exist'
                });
            }
        }

        await inventory.update({
            name: name ?? inventory.name,
            location: location ?? inventory.location,
            powerUsage: powerUsage ?? inventory.powerUsage,
            status: status ?? inventory.status,
            userId: userId ?? inventory.userId
        });

        res.json(inventory);
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ error: 'Failed to update inventory' });
    }
});

app.delete('/inventories/:id', requireAuth, async (req, res) => {
    try {
        const deletedRowsCount = await Factory.destroy({
            where: { id: req.params.id }
        });

        if (deletedRowsCount === 0) {
            return res.status(404).json({ error: 'Inventory not found' });
        }

        res.json({ message: 'Inventory deleted successfully' });
    } catch (error) {
        console.error('Error deleting inventory:', error);
        res.status(500).json({ error: 'Failed to delete inventory' });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;