import { Op } from 'sequelize';
import sequelize from './src/utils/postgres';
import Transaction from './src/models/transaction';

async function main() {
    console.log("Starting script...");
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully.");
        const results = await Transaction.findAll({ limit: 1 });
        console.log("Results: ", results.length);
    } catch(e) {
        console.error(e)
    } finally {
        await sequelize.close();
    }
}

main().catch(console.dir);
