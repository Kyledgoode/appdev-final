# appdev-final
Final Project

## Overview
This is a Satisfactory Resource Inventory API. This was built with Node.js, express, sequelize, and SQLite.
It is designed to help players keep track of their factory power usage and inventory as well as the exact number of resources that belong to factories. Players can update these numbers in order to track changes to the inventory or delete obsolete aspects. It also includes user authentication and authorization. User can log in based on if they are a regular player or the host. The API uses JWT tokens to protect routes from being accessed by players who are not authorized to use them. 

## Features
- Manage players/users
- Manage inventories
- Manage resources
- CRUD support
- Sequelize relationships
- Jest and Supertest for basic testing
- User registration and login
- JWT authentication
- Authorization based on player or admin roles

## Tools Used
- Node.js
- Express.js
- Sequelize
- SQLite3
- dotenv
- Jest
- Supertest
- bcryptjs
- jsonwebtoken

## Database Structure

### Users
Player information is stored
- id
- name
- email
- password
- role

### Inventories
Factory inventory and information
- id
- name
- location
- powerUsage
- status
- userId

### Items
Resources stored in a factory
- id
- name
- category
- quantityStored
- factoryId

## Relationships
- One user has multiple inventories/factories
- One inventory/factory can have multiple items

## Setup Instructions
1. Clone the repository
2. Install dependencies `npm install`
3. Set up environmental variables in `.env`
4. Setup the database `npm run setup`
5. Seed the database `npm run seed`
6. Start the server `npm run start`