
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
        )({
            id:id
        }))
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
            "ID, " +
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
    async createTX(
        sendCategory,
        transactionType,
        amount,
        receiveCategory
    ) {
        let txType;
        if (!receiveCategory) {
            receiveCategory = sendCategory;
            if (transactionType === 'Add') {
                txType = 'Add'
            } else {
                txType = 'Subtract'
            }
        } else {
            txType = 'Transfer'
        }

        await this.pool.query(sql(
            "INSERT INTO PERSONAL_BUDGET.ENVELOPES.TRANSACTIONS " +
            "(CALLER_ID, TX_TYPE, SEND_CATEGORY, RECEIVE_CATEGORY, AMOUNT) " +
            "VALUES (:callerID,:txType,:sendCategory,:receiveCategory,:amount);"
        )({
            callerID:this.userId,
            txType:txType,
            sendCategory:sendCategory,
            receiveCategory:receiveCategory,
            amount:amount
        }));
    }

    async deleteEnvelopeBudget(envelopeCategory) {
        const envelope = await this.getEnvelopeByCategory(envelopeCategory);
        const envelopeBalance = await envelope.balance
        const response = await this.spendEnvelope(envelopeCategory, envelopeBalance);
        await this.createTX(
            envelopeCategory,
            'Subtract',
            envelopeBalance
        )
        return response;
    }

    async spendEnvelope(envelopeCategory, amount) {
        const envelope = await this.getEnvelopeByCategory(envelopeCategory);
        const envelopeID = envelope.id;
        const envelopeBalance = envelope.balance;


        if (envelopeBalance < amount) {
            return "Not enough to spend!"
        } else {
            const newBalance = (envelopeBalance - parseInt(amount));

            await this.pool.query(sql(
                "UPDATE PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
                "SET BALANCE = :newBalance WHERE ID = :id;"
            )({
                newBalance:newBalance,
                id:envelopeID
            }))
            await this.createTX(
                envelopeCategory,
                'Subtract',
                envelopeBalance
            );
        }
    }

    async addEnvelopeBudget(envelopeCategory, amount) {
        //const userBudget = await this.getUserById(this.userId).rows.budget // does not work??
        const envelope = await this.getEnvelopeByCategory(envelopeCategory)
        const envelopeBalance = envelope.balance

        if (amount) {
            const newBalance = parseInt(amount) + envelopeBalance;

            await this.pool.query(sql(
                "UPDATE PERSONAL_BUDGET.ENVELOPES.ENVELOPE " +
                "SET BALANCE = :balance " +
                "WHERE CATEGORY = :envelopeCategory;"
            )({
                balance: newBalance,
                envelopeCategory: envelopeCategory
            }))
            await this.createTX(
                envelopeCategory,
                'Add',
                amount
            )

        } else {

            return "Failed to add balance.";
        }
    }
    async transferFund(fromCategory, toCategory, amount) {

        const oldEnvelope = await this.getEnvelopeByCategory(fromCategory);
        const newEnvelope = await this.getEnvelopeByCategory(toCategory);
        if (amount > oldEnvelope.balance) {
            return "Error, budget underflow";
        } else {

            //design choice, transaction are create for each transaction
            // may need to add logic to turn off tx creation on transfer
            await this.spendEnvelope(oldEnvelope.category, amount);
            await this.addEnvelopeBudget(newEnvelope.category, amount);

            // await this.createTX(
            //     oldEnvelope.category,
            //     'Transfer',
            //     amount,
            //     newEnvelope.category
            // )

        }
    }
}



module.exports= EnvelopeDB

