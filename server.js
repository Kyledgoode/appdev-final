const express = require('express');
const { db, User, Factory, Resource } = require('./database/setup');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Test connection
async function testConnection() {
    try {
        await db.authenticate();
        console.log('Connection to database established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

app.get('/', (req, res) => {
    res.json({ message: 'Satisfactory Resource Inventory API is running.' });
});



// Users
// GET /users
app.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            include: [
                {
                    model: Factory
                }
            ]
        });

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /users
app.post('/users', async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                error: 'name and email are required'
            });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email already exists'
            });
        }

        const newUser = await User.create({ name, email });
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /users/:id
app.put('/users/:id', async (req, res) => {
    try {
        const { name, email } = req.body;

        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({
                    error: 'User with this email already exists'
                });
            }
        }

        await user.update({
            name: name ?? user.name,
            email: email ?? user.email
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE /users/:id
app.delete('/users/:id', async (req, res) => {
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

// ITEMS (RESOURCES)
// GET /items
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

// GET /items/:id
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

// POST /items
app.post('/items', async (req, res) => {
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

// PUT /items/:id
app.put('/items/:id', async (req, res) => {
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

// DELETE /items/:id
app.delete('/items/:id', async (req, res) => {
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

// INVENTORIES (FACTORIES)
// GET /inventories
app.get('/inventories', async (req, res) => {
    try {
        const inventories = await Factory.findAll({
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'email']
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

// GET /inventories/:id
app.get('/inventories/:id', async (req, res) => {
    try {
        const inventory = await Factory.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'email']
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

// POST /inventories
app.post('/inventories', async (req, res) => {
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

// PUT /inventories/:id
app.put('/inventories/:id', async (req, res) => {
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

// DELETE /inventories/:id
app.delete('/inventories/:id', async (req, res) => {
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


// ERROR HANDLING
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