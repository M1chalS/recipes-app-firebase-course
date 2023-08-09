const firebaseConfig = require('./FirebaseConfig');
const recipesAPi = require('./recipesApi');
const functions = firebaseConfig.functions;
const auth = firebaseConfig.auth;
const firestore = firebaseConfig.firestore;
const storageBucket = firebaseConfig.storageBucket;
const admin = firebaseConfig.admin;

exports.api = functions.https.onRequest(recipesAPi);

exports.onCreateRecipe = functions.firestore
    .document('recipes/{recipeId}')
    .onCreate(async (snap) => {
        const countDocRef = firestore.collection('recipeCount').doc('count');
        const countDoc = await countDocRef.get();

        if(countDoc.exists) {
            countDocRef.update({ count: admin.firestore.FieldValue.increment(1) });
        } else {
            countDocRef.set({ count: 1 });
        }

        const recipe = snap.data();

        if(recipe.isPublished) {
            const countDocPublishedRef = firestore.collection('recipeCount').doc('published');
            const countDocPublished = await countDocPublishedRef.get();

            if(countDocPublished.exists) {
                countDocPublishedRef.update({ count: admin.firestore.FieldValue.increment(1) });
            } else {
                countDocPublishedRef.set({ count: 1 });
            }
        }

    });

exports.onDeleteRecipe = functions.firestore
    .document('recipes/{recipeId}')
    .onDelete(async (snap) => {
        const recipe = snap.data();
        const imageUrl = recipe.imageUrl;

        if(imageUrl) {
            const decodedUrl = decodeURIComponent(imageUrl);
            const startIndex = decodedUrl.indexOf('/o/') + 3;
            const endIndex = decodedUrl.indexOf('?');
            const fullFilePath = decodedUrl.substring(startIndex, endIndex);
            const file = storageBucket.file(fullFilePath);

            console.log(`Deleting file ${fullFilePath}`);

            try {
                await file.delete();
                console.log(`File ${fullFilePath} deleted`);
            } catch (error) {
                console.log(`Error deleting file ${error.message}`);
            }

        }

        const countDocRef = firestore.collection('recipeCount').doc('count');
        const countDoc = await countDocRef.get();

        if(countDoc.exists) {
            countDocRef.update({ count: admin.firestore.FieldValue.increment(-1) });
        } else {
            countDocRef.set({ count: 0 });
        }



        if(recipe.isPublished) {
            const countDocPublishedRef = firestore.collection('recipeCount').doc('published');
            const countDocPublished = await countDocPublishedRef.get();

            if(countDocPublished.exists) {
                countDocPublishedRef.update({ count: admin.firestore.FieldValue.increment(-1) });
            } else {
                countDocPublishedRef.set({ count: 0 });
            }
        }

    });

exports.onUpdateRecipe = functions.firestore
    .document('recipes/{recipeId}')
    .onUpdate(async (change) => {
        const oldRecipe = change.before.data();
        const newRecipe = change.after.data();

        if(oldRecipe.isPublished !== newRecipe.isPublished) {
            const countDocRef = firestore.collection('recipeCount').doc('published');
            const countDoc = await countDocRef.get();

            if(countDoc.exists) {
                if(newRecipe.isPublished) {
                    countDocRef.update({ count: admin.firestore.FieldValue.increment(1) });
                } else {
                    countDocRef.update({ count: admin.firestore.FieldValue.increment(-1) });
                }
            } else {
                if(newRecipe.isPublished) {
                    countDocRef.set({ count: 1 });
                } else {
                    countDocRef.set({ count: 0 });
                }
            }
        }

    });

const runtimeOptions = {
    timeoutSeconds: 300,
    memory: '256MB'
};

exports.dailyCheckRecipePublishDate = functions.runWith(runtimeOptions).pubsub.schedule("0 0 * * *").onRun(async () => {
    console.log("Running daily check for recipe publish date");

    const snapshot = await firestore.collection('recipes').where('isPublished', '==', false).get();

    if(snapshot.empty) {
        console.log("No unpublished recipes found");
        return;
    }

    snapshot.forEach((doc) => {
        const data = doc.data();
        const now = Date.now() / 1000;
        const isPublished = data.publishDate.seconds <= now;

        if(isPublished) {
            doc.ref.update({ isPublished: true });
            console.log(`Recipe ${data.name} published`);
        }
    });
});