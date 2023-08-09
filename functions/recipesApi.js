const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const firebaseConfig = require('./FirebaseConfig');
const Utilities = require('./utilities');

const auth = firebaseConfig.auth;
const firestore = firebaseConfig.firestore;

const app = express();
app.use(cors({origin: true}));
app.use(bodyParser.json());

app.post('/recipes', async (req, res) => {
    const authorization = req.headers.authorization;

    if(!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(403).send('Unauthorized');
    }

    try {
        await Utilities.authorizeUser(authorization, auth);
    } catch (e) {
        return res.status(403).send('Unauthorized');
    }

    const newRecipe = req.body;
    const missingFields = Utilities.validateRecipePostPut(newRecipe);

    if(missingFields) {
        return res.status(400).send(`Missing fields: ${missingFields}`);
    }

    const recipe = Utilities.sanitizeRecipePostPut(newRecipe);

    try {
        const response = await firestore.collection('recipes').add(recipe);

        const recipeId = response.id;

        return res.status(201).send({recipeId});
    } catch (e) {
        return res.status(500).send('Internal Server Error');
    }

});

app.get("/recipes", async (request, response) => {
    const authorizationHeader = request.headers["authorization"];
    const queryObject = request.query;
    const category = queryObject["category"] ? queryObject["category"] : "";
    const orderByField = queryObject["orderByField"]
        ? queryObject["orderByField"]
        : "";
    const orderByDirection = queryObject["orderByDirection"]
        ? queryObject["orderByDirection"]
        : "asc";
    const pageNumber = queryObject["pageNumber"] ? queryObject["pageNumber"] : "";
    const perPage = queryObject["perPage"] ? queryObject["perPage"] : "";

    let isAuth = false;
    let collectionRef = firestore.collection("recipes");

    try {
        await Utilities.authorizeUser(authorizationHeader, auth);

        isAuth = true;
    } catch (error) {
        collectionRef = collectionRef.where("isPublished", "==", true);
    }

    if (category) {
        collectionRef = collectionRef.where("category", "==", category);
    }

    if (orderByField) {
        collectionRef = collectionRef.orderBy(orderByField, orderByDirection);
    }

    if (perPage) {
        collectionRef = collectionRef.limit(Number(perPage));
    }

    if (pageNumber > 0 && perPage) {
        const pageNumberMultiplier = pageNumber - 1;
        const offset = pageNumberMultiplier * perPage;
        collectionRef = collectionRef.offset(offset);
    }

    let recipeCount = 0;
    let countDocRef;

    if (isAuth) {
        countDocRef = firestore.collection("recipeCounts").doc("all");
    } else {
        countDocRef = firestore.collection("recipeCounts").doc("published");
    }

    const countDoc = await countDocRef.get();

    if (countDoc.exists) {
        const countDocData = countDoc.data();

        if (countDocData) {
            recipeCount = countDocData.count;
        }
    }

    try {
        const firestoreResponse = await collectionRef.get();
        const fetchedRecipes = firestoreResponse.docs.map((recipe) => {
            const id = recipe.id;
            const data = recipe.data();
            data.publishDate = data.publishDate._seconds;

            return { ...data, id };
        });

        const payload = {
            recipeCount,
            documents: fetchedRecipes,
        };

        response.status(200).send(payload);
    } catch (error) {
        response.status(400).send(error.message);
    }
});

app.put("/recipes/:id", async (request, response) => {
    const authorizationHeader = request.headers["authorization"];

    if (!authorizationHeader) {
        response.status(401).send("Missing Authorization Header");
        return;
    }

    try {
        await Utilities.authorizeUser(authorizationHeader, auth);
    } catch (error) {
        response.status(401).send(error.message);
        return;
    }

    const id = request.params.id;
    const newRecipe = request.body;
    const missingFields = Utilities.validateRecipePostPut(newRecipe);

    if (missingFields) {
        response
            .status(400)
            .send(`Recipe is not valid. Missing/invalid fields: ${missingFields}`);
        return;
    }

    const recipe = Utilities.sanitizeRecipePostPut(newRecipe);

    try {
        await firestore.collection("recipes").doc(id).set(recipe);

        response.status(200).send({ id });
    } catch (error) {
        response.status(400).send(error.message);
    }
});

app.delete("/recipes/:id", async (request, response) => {
    const authorizationHeader = request.headers["authorization"];

    if (!authorizationHeader) {
        response.status(401).send("Missing Authorization Header");
        return;
    }

    try {
        await Utilities.authorizeUser(authorizationHeader, auth);
    } catch (error) {
        response.status(401).send(error.message);
    }

    const id = request.params.id;

    try {
        await firestore.collection("recipes").doc(id).delete();
        response.status(200).send();
    } catch (error) {
        response.status(400).send(error.message);
    }
});

if(process.env.NODE_ENV !== 'production') {
    app.listen(3006, () => console.log('Recipes API listening on port 3006!'));
}

module.exports = app;