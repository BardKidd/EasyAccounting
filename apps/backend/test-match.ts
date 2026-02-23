import { Op } from 'sequelize';

const desc1 = "UBER* EATS HELP.UBER.COM";
const txDesc = "UBER";

console.log(desc1.toLowerCase().includes(txDesc.toLowerCase()));
console.log(txDesc.toLowerCase().includes(desc1.toLowerCase()));
