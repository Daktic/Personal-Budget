
const {Pool} = require('pg');
require('dotenv').config()
const sql = require('yesql').pg

const username = process.env.POSTGRES_USERNAME;
const password = process.env.POSTGRES_PASSWORD;

class EnvelopeDB {
    constructor(userId, budget=0) {
        const connectionString = {
            user: username,
            host: 'localhost',
            database: 'personal_budget',
            password: password,
            port: 5432
        };

        this.pool = new Pool(connectionString);
        //class variables
        this.budget = budget;
        this.userId = userId
    }
    //user details
    async getUserById(id) {
        const response = this.pool.query(sql(
            "SELECT " +
            "USERNAME, " +
            "BUDGET " +
            "FROM PERSONAL_BUDGET.ENVELOPES.USERS " +
            "WHERE ID = :id;"
        ))({
            id:id
        })
        return response;
    }
    async setUserBudget(id, amount) {
        const response = this.pool.query(sql(
            "UPDATE PERSONAL_BUDGET.ENVELOPES.USERS " +
            "SET BUDGET = :amount " +
            "WHERE ID = :id " +
            "RETURNING BUDGET;"
        )({
            balance: amount,
            id:id
        }))
        return response.rows[0].budget;
    }

    //envelope details
    async getEnvelopeById(envelopeId) {
        const response = this.pool.query(sql(
            "SELECT " +
            "CATEGORY," +
            "BALANCE " +
            "FROM PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
            "WHERE ID = :id;"
        )({
            id:envelopeId
        }))
        return response;
    }

    async setEnvelopeBudget(envelopeId, budget) {
        const userBudget = await this.getUserById(this.userId).balance
        if (budget < userBudget) {
            const response = await this.pool.query(sql(
                "UPDATE PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
                "SET BALANCE = :budget " +
                "WHERE ID = :id RETURNING BUDGET;"
            ))({
                budget: budget,
                id: envelopeId
            })
            return response.rows[0].budget
        } else {
            return "Failed to set budget."
        }
    }
    //async transferEnvelopeBudget()

    async getEnvelopeByCategory(category) {
        const response = this.pool.query(sql(
            "SELECT " +
            "CATEGORY, " +
            "BALANCE " +
            "FROM PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
            "WHERE CATEGORY = :category;"
        )({
            category: category
        }))
        return response;
    }
    async addEnvelope(ownerId, category, balance) {
        const response = await this.pool.query(sql(
            "INSERT INTO PERSONAL_BUDGET.ENVELOPES.ENVELOPE" +
            "(OWNER_ID, CATEGORY, BALANCE) " +
            "VALUES (:ownerId, :category, :balance) RETURNING *;")({
                ownerId: ownerId,
                category: category,
                balance: balance
            }
        ))
        //console.log(response.rows[0].id)
        return response.rows[0].id
    }
}
testDB = new EnvelopeDB();

