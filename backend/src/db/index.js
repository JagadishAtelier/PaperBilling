import { Sequelize } from "sequelize";

// const sequelize = new Sequelize("mysql://dutch:DutchDB123@167.71.229.209:3306/dutch");  // for Development
// const sequelize = new Sequelize("mysql://dutch:DutchDB123@localhost:3306/dutch"); // for deployment
const sequelize = new Sequelize("mysql://paperbillinguser:dutch26Billing@localhost:3306/demopaperbilling"); // for deployment

sequelize.authenticate().then((data) => console.log("Database is Connected")).catch((err) => console.log(`Error ${err}`))


export { sequelize };




// import { Sequelize } from "sequelize";

// const sequelize = new Sequelize("hms", "ramya", "ramya", {
//   host: "192.168.1.150",
//   port: 3306,
//   dialect: "mysql",
// });

// sequelize
//   .authenticate()
//   .then(() => console.log("Database is Connected"))
//   .catch((err) => console.error(`Database connection error: ${err}`));


// export { sequelize };




