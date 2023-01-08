const express = require('express');
const apiRouter = express.Router();

// db imports
const EnvelopeDB = require("./db")

const envelopes = new EnvelopeDB(1);

// middlewear imports
const {
    updateEnvelopeByIndex
} = require("./middleware");

// spendRouter
const spendRouter = require("./spend");
apiRouter.use("/spend", spendRouter)

// GET all
apiRouter.get("/", async (req, res) =>{
    res.send(await envelopes.getEnvelopes()); //returns an array of envelope objects
});

// GET categoryName
apiRouter.get("/:categoryName", async (req, res, next) =>{
    const envelopeParam = req.params.categoryName;
    res.send(await envelopes.getEnvelopeByCategory(envelopeParam)); //returns a single envelope object
});

// POST >> db.js
apiRouter.post("/", async (req, res, next) =>{
    const envelopeBody = req.body;
    const envelopeID = await envelopes.addEnvelope(
        envelopeBody.category,
        envelopeBody.budget? envelopeBody.budget : null //The budget isn't required
                                                                // This will check for budget and if there is none, pass null
                                                                //I am not sure if this is even needed
    );
    res.send(await envelopes.getEnvelopeById(envelopeID)); //returns the newly created envelope
});

// PUT categoryName
apiRouter.put("/:categoryName", async (req, res, next) =>{
    res.send(await envelopes.setCategoryName(req.params.categoryName, req.body.newName));
});

apiRouter.delete("/:categoryName", async (req, res, next)=>{
    res.send(await envelopes.deleteEnvelope(null, req.params.categoryName));

    res.send("Envelope successfully deleted");
});

// Export router to "server.js"
module.exports = apiRouter;