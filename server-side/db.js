
const {Pool} = require('pg');
require('dotenv').config()
const sql = require('yesql').pg

const username = process.env.POSTGRES_USERNAME;
const password = process.env.POSTGRES_PASSWORD;

class EnvelopeDB {
    constructor() {
        const connectionString = {
            user: username,
            host: 'localhost',
            database: 'personal_budget',
            password: password,
            port: 5432
        };

        this.pool = new Pool(connectionString);
    }
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

