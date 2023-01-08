
const {Pool} = require('pg');
const path = require('path')
const {response} = require("express");
require('dotenv').config({ path: path.resolve(__dirname, './.env') })
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

    async getEnvelopes() {
        const response = await this.pool.query("SELECT *" +
            "FROM PERSONAL_BUDGET.ENVELOPES.ENVELOPE;")

        return response.rows
    }
    async getEnvelopeById(envelopeId) {
        const response = await this.pool.query(sql(
            "SELECT " +
            "CATEGORY," +
            "BALANCE " +
            "FROM PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
            "WHERE ID = :id;"
        )({
            id:envelopeId
        }))
        return response.rows[0];
    }
    async getEnvelopeByCategory(category) {
        const response = await this.pool.query(sql(
            "SELECT " +
            "CATEGORY, " +
            "BALANCE " +
            "FROM PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
            "WHERE CATEGORY = :category;"
        )({
            category: category
        }))
        return response.rows[0];
    }

    async setCategoryName(oldName, newName) {
        const response = await this.pool.query(sql(
            "UPDATE PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
            "SET CATEGORY = :newName WHERE CATEGORY = :oldName " +
            "RETURNING CATEGORY;"
        )({
            newName:newName,
            oldName:oldName
        }))
        return response.rows[0].category;

    }

    async addEnvelope(category, balance) {
        const response = await this.pool.query(sql(
            "INSERT INTO PERSONAL_BUDGET.ENVELOPES.ENVELOPE" +
            "(OWNER_ID, CATEGORY, BALANCE) " +
            "VALUES (:ownerId, :category, :balance) RETURNING *;")({
                ownerId: this.userId,
                category: category,
                balance: balance
            }
        ))
        //console.log(response.rows[0].id)
        return response.rows[0].id
    }
    async deleteEnvelope(id=null, category=null) { //can take id or category name
        let param;
        let value;
        if (id) {
            param = "ID";
            value = id;
        } else if (category) {
            param = "CATEGORY"
            value = category;
        } else {
            return "you must enter an Id or a Category!"
        }
        const response = await this.pool.query(sql(
            "DELETE FROM PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
            "WHERE :param = ':category;'"
        )({
            param:param,
            value:value
        }))

        return response;
    }
    //Transaction endpoints

    async createTX(sendCategory, receiveCategory=null) {
        const response = await this.pool.query(sql(
            "INSERT INTO PERSONAL_BUDGET.ENVELOPE.ENVELOPE"
        ))
    }

    async getEnvelopeBudget(envelopeCategory) {
        return await this.pool.query(sql(
            "SELECT BALANCE PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
            "WHERE CATEGORY = :category;"
        )({
            category:envelopeCategory
        })).rows[0].balance;
    }
    async deleteEnvelopeBudget(envelopeCategory) {
        const envelopeID = await this.getEnvelopeByCategory(envelopeCategory).id;
        const response = await this.setEnvelopeBudget(envelopeID, 0);
        return response;
    }

    async spendEnvelope(envelopeCategory, amount) {
        const envelope = await this.getEnvelopeByCategory(envelopeCategory);
        const envelopeID = envelope.id;
        const envelopeBudget = envelope.balance;
        if (envelopeBudget < amount) {
            return "Not enough to spend!"
        } else {
            return await this.setEnvelopeBudget(envelopeID, amount);
        }
    }

    async setEnvelopeBudget(envelopeId, budget) {
        const userBudget = await this.getUserById(this.userId).balance
        if (budget < userBudget) {
            const response = await this.pool.query(sql(
                "UPDATE PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
                "SET BALANCE = :budget " +
                "WHERE ID = :envelopeId RETURNING BALANCE;"
            ))({
                budget: budget,
                id: envelopeId
            })
            return response.rows[0].balance
        } else {
            return "Failed to set budget."
        }
    }
    async transferFund(fromCategory, toCategory, amount) {

        const oldEnvelopeBudget = await this.pool.query(sql(
            "SELECT BALANCE FROM " +
            "PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
            "WHERE CATEGORY = :fromCategory;"
        )({
            fromCategory:fromCategory
        }))
        const newEnvelopeBudget = await this.pool.query(sql(
            "SELECT BALANCE FROM " +
            "PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
            "WHERE CATEGORY = :toCategory;"
        )({
            toCategory:toCategory
        }))

        if (amount > oldEnvelopeBudget.rows[0].balance) {
            return "Error, budget underflow";
        } else {

            let newAmount = oldEnvelopeBudget.rows[0].balance - amount;
            await this.pool.query(sql(
                "UPDATE PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
                "SET BALANCE = :newAmount WHERE CATEGORY = :fromCategory " +
                "RETURNING BALANCE;"
            )({
                newAmount:newAmount,
                fromCategory:fromCategory
            }))

            newAmount = newEnvelopeBudget.rows[0].balance + amount;
            await this.pool.query(sql(
                "UPDATE PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
                "SET BALANCE = :amount WHERE CATEGORY = :toCategory " +
                "RETURNING BALANCE;"
            )({
                amount:newAmount,
                toCategory:toCategory
            }))
        }
    }
}



module.exports= EnvelopeDB

