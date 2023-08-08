import './App.css';

import {startTransition, useEffect, useState} from "react";
import LoginForm from "./components/LoginForm.jsx";
import {onAuthStateChanged} from "firebase/auth";
import {auth, db} from "./FirebaseConfig.js";
import AddEditRecipeForm from "./components/AddEditRecipeForm.jsx";
import {addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc, where} from "firebase/firestore";

export default function App() {
    const [user, setUser] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [currentRecipe, setCurrentRecipe] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState("");
    const [perPage, setPerPage] = useState(3);

    onAuthStateChanged(auth, setUser);

    console.log(recipes);

    const handleAddRecipe = async (newRecipe) => {
        try {
            const res = await addDoc(collection(db, "recipes"), newRecipe);

            handleFetchRecipes();

            alert("Recipe added successfully ID: " + res.id);
        } catch (error) {
            alert(error.message);
        }
    }

    const fetchRecipes = async () => {
        const conditions = [];

        if (categoryFilter) {
            conditions.push({
                field: "category",
                operator: "==",
                value: categoryFilter
            });
        }

        if (!user) {
            conditions.push({
                field: "isPublished",
                operator: "==",
                value: true
            });
        }

        let fetchedRecipes = [];

        try {
            const response = await getDocs(query(collection(db, "recipes"), ...conditions.map(cond => where(cond.field, cond.operator, cond.value)), orderBy("publishDate", "desc"), limit(perPage)));

            const newRecipes = response.docs.map((recipe) => {
                const data = recipe.data();

                data.publishDate = new Date(data.publishDate.seconds * 1000);

                return {
                    id: recipe.id,
                    ...data
                }
            });

            fetchedRecipes = [...newRecipes];
        } catch (e) {
            console.error(e.message);
            throw e;
        }

        return fetchedRecipes;
    }

    const handleFetchRecipes = async () => {
        try {
            const fetchedRecipes = await fetchRecipes();
            setRecipes(fetchedRecipes);
        } catch (e) {
            console.error(e.message);
            throw e;
        }
    }

    useEffect(() => {
        fetchRecipes().then((fetchedRecipies) => {
            setRecipes(fetchedRecipies);
        }).catch((error) => {
            alert(error.message);
            throw error;
        });
    }, [user, categoryFilter, perPage]);

    const lookupCategoryLabel = (category) => {
        const categories = {
            breadsSandwichesPizza: "Breads, sandwiches, and Pizza",
            eggsAndBreakfast: "Eggs and Breakfast",
            desserts: "Desserts",
            soupsSaladsSides: "Soups, Salads, and Sides",
            fishAndSeeFood: "Fish and Seafood",
            vegetables: "Vegetables"
        }

        return categories[category];
    }

    const formatDate = (date) => {
        const day = date.getUTCDate();
        const month = date.getUTCMonth() + 1;
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    const handleUpdateRecipe = async (newRecipe, recipeId) => {
        try {
            await updateDoc(doc(db, "recipes", recipeId), newRecipe);

            handleFetchRecipes();

            alert("Recipe updated successfully");
        } catch (e) {
            alert(e.message);
            throw e;
        }
    }

    const handleEditRecipeClick = (recipeId) => {
        const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId);

        if (selectedRecipe) {
            startTransition(() => {
                setCurrentRecipe(selectedRecipe);
            });
            window.scrollTo(0, document.body.scrollHeight);
        }
    }

    const handleEditRecipeCancel = () => {
        setCurrentRecipe(null);
    }

    const handleDeleteRecipe = async (recipeId) => {
        try {
            await deleteDoc(doc(db, "recipes", recipeId));

            setCurrentRecipe(null);
            handleFetchRecipes();
        } catch (e) {
            alert(e.message);
            throw e;
        }


    }

    return (
        <div className="App">
            <div className="title-row">
                <h1 className="title">Firebase recipes</h1>
                <LoginForm existingUser={user}/>
            </div>
            <div className="main">
                <div className="row filters">
                    <label className="recipe-label input-label">
                        Category:
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="select"
                            required
                        >
                            <option value=""></option>
                            <option value="breadsSandwichesAndPizza">
                                Breads, Sandwiches, and Pizza
                            </option>
                            <option value="eggsAndBreakfast">Eggs & Breakfast</option>
                            <option value="desserts">
                                Desserts
                            </option>
                            <option value="fishAndSeafood">Fish & Seafood</option>
                            <option value="vegetables">Vegetables</option>
                        </select>
                    </label>
                </div>
                <div className="center">
                    <div className="recipe-list-box">
                        {
                            recipes && recipes.length > 0 ? <div className="recipe-list">
                                {
                                    recipes.map((recipe) => {
                                        return <div key={recipe.id} className="recipe-card">
                                            {
                                                !recipe.isPublished ? <div className="unpublished">
                                                    Unpublished
                                                </div> : null
                                            }
                                            <div className="recipe-name">{recipe.name}</div>
                                            <div className="recipe-image-box">
                                                {
                                                    recipe.imageUrl && <img className="recipe-image" src={recipe.imageUrl} alt="Recipe image..." />
                                                }
                                            </div>
                                            <div
                                                className="recipe-field">Category: {lookupCategoryLabel(recipe.category)}</div>
                                            <div className="recipe-field">Publish
                                                Date: {formatDate(recipe.publishDate)}</div>
                                            {
                                                user &&
                                                <button type="button" onClick={() => handleEditRecipeClick(recipe.id)}
                                                        className="primary-button">EDIT</button>
                                            }
                                        </div>
                                    })
                                } </div> : <p>No recipes found</p>
                        }
                    </div>
                </div>
                {
                    recipes && recipes.length > 0 && <label className="input-label">
                        Recipes per page:
                        <select
                            value={perPage}
                            onChange={(e) => setPerPage(e.target.value)}
                            className="select"
                            required
                        >
                            <option value="3">3</option>
                            <option value="6">6</option>
                            <option value="9">9</option>
                        </select>
                    </label>
                }
                {user && <AddEditRecipeForm existingRecipe={currentRecipe} handleUpdateRecipe={handleUpdateRecipe}
                                            handleEditRecipeCancel={handleEditRecipeCancel}
                                            handleAddRecipe={handleAddRecipe} handleDeleteRecipe={handleDeleteRecipe}/>}
            </div>
        </div>
    )
}