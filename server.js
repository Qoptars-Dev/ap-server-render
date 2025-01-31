import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import ImageObject from './ImageObject.js'; // Import the model for 'imageObject'
import dotenv from 'dotenv';

dotenv.config(); // Initialize dotenv

const MONGO_URI = process.env.MONGODB_URI;

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB (imagebase database)
mongoose.connect(MONGO_URI, {})
.then(() => console.log('MongoDB connected to imagebase'))
.catch(err => console.error('MongoDB connection error:', err));

// Endpoint to fetch data from 'imageObject' collection
app.get('/data', async (req, res) => {
    try {
        const data = await ImageObject.find({}); // Use the ImageObject model to query the collection
        res.json(data);
    } catch (err) {
        res.status(500).send(err);
    }
});

// API to fetch counts for "garbage" and "mosquito" images based on ward and date
app.get('/image-count', async (req, res) => {
    const { ward, date } = req.query;
    if (!ward || !date) {
        return res.status(400).json({ message: 'Ward and date are required' });
    }
    try {
        // Count the number of "garbage" images
        const garbageCount = await ImageObject.countDocuments({ ward, date, type: 'garbage' });
        // Count the number of "mosquito" images
        const mosquitoCount = await ImageObject.countDocuments({ ward, date, type: 'mosquito' });

        res.status(200).json({
            garbageCount,
            mosquitoCount,
        });
    } catch (error) {
        console.error('Error fetching image counts:', error);
        res.status(500).json({ message: 'Error fetching image counts' });
    }
});

// API to fetch counts for "garbage" and "mosquito" images based on ward
app.get('/ward-image-count', async (req, res) => {
    const { ward } = req.query;

    if (!ward) {
        return res.status(400).json({ message: 'Ward is required' });
    }

    try {
        // Fetch data grouped by date and type
        const counts = await ImageObject.aggregate([
            { $match: { ward } },
            { $group: {
                _id: { date: "$date", type: "$type" },
                count: { $sum: 1 }
            }},
            { $group: {
                _id: "$_id.date",
                data: {
                    $push: {
                        type: "$_id.type",
                        count: "$count"
                    }
                }
            }},
            { $sort: { _id: 1 } } // Sort by date
        ]);

        // Transform the data to the desired format
        const result = counts.map(dateGroup => {
            const garbageCount = dateGroup.data.find(item => item.type === 'garbage')?.count || 0;
            const mosquitoCount = dateGroup.data.find(item => item.type === 'mosquito')?.count || 0;
            return {
                date: dateGroup._id,
                garbageCount,
                mosquitoCount
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching image counts:', error);
        res.status(500).json({ message: 'Error fetching image counts' });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

