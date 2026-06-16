import mongoose from "mongoose";
import Category from "../models/Category";

/**
 * Connect to MongoDB using MONGO_URI from environment variables.
 */
export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables.");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");

  // Seed default categories and keep them updated with translations
  try {
    console.log("Seeding or updating default categories...");
    const defaultCategories = [
      {
        name: "Quran",
        slug: "quran",
        description: "Quran studies, recitation, and reflections",
        translations: {
          ar: {
            name: "القرآن",
            description: "دراسات وتلاوات وتدبر القرآن الكريم"
          }
        }
      },
      {
        name: "Hadith",
        slug: "hadith",
        description: "Prophetic traditions and narrations",
        translations: {
          ar: {
            name: "الحديث",
            description: "الأحاديث النبوية الشريفة ورواياتها"
          }
        }
      },
      {
        name: "Fiqh",
        slug: "fiqh",
        description: "Islamic jurisprudence and rulings",
        translations: {
          ar: {
            name: "الفقه",
            description: "الفقه الإسلامي والأحكام الشرعية"
          }
        }
      },
      {
        name: "Dua",
        slug: "dua",
        description: "Supplications, prayers, and remembrance",
        translations: {
          ar: {
            name: "الدعاء",
            description: "الأدعية والأذكار والمناجاة"
          }
        }
      },
      {
        name: "Tafsir",
        slug: "tafsir",
        description: "Quranic exegesis and commentary",
        translations: {
          ar: {
            name: "التفسير",
            description: "تفسير القرآن الكريم وبيان معانيه"
          }
        }
      },
      {
        name: "Seerah",
        slug: "seerah",
        description: "Biography of the Prophet Muhammad (PBUH)",
        translations: {
          ar: {
            name: "السيرة النبوية",
            description: "السيرة النبوية المطهرة وحياة الرسول صلى الله عليه وسلم"
          }
        }
      },
      {
        name: "Reminder",
        slug: "reminder",
        description: "Spiritual reminders and advice",
        translations: {
          ar: {
            name: "الخواطر والنقاشات",
            description: "الخواطر والنقاشات والمواعظ الإيمانية"
          }
        }
      }
    ];

    const defaultSlugs = defaultCategories.map(cat => cat.slug);
    const deleteResult = await Category.deleteMany({ slug: { $nin: defaultSlugs } });
    if (deleteResult.deletedCount > 0) {
      console.log(`Removed ${deleteResult.deletedCount} legacy categories from the database.`);
    }

    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $set: cat },
        { upsert: true, new: true }
      );
    }
    console.log("Default categories seeded and updated successfully");
  } catch (err) {
    console.error("Error seeding or updating default categories:", err);
  }
};
