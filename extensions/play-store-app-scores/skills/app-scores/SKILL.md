---
name: play-store-app-scores
description: When to use: user asks for Google Play app research, app rankings, or X score for Android apps. Use the play_store_app_scores tool and present the result as a ranked table (app name, installs, age in months, score).
---

# Play Store App Scores

Use this skill when the user asks for:

- Google Play app research or search by keyword
- App rankings or top apps for a keyword
- X score for Android apps (installs + age)

## How to use

1. Call the **play_store_app_scores** tool with:
   - `keyword` (required): search term (e.g. "fitness", "notes")
   - `limit` (optional): max apps to fetch (default 20, max 250)
   - `country` (optional): two-letter country code (e.g. "us", "gb")
2. Present the tool result as a **ranked table** with columns: Rank, App, Installs, Age (months), Score.
3. The tool already returns markdown; you can relay it or reformat for the channel.

## Score formula

X = (A / 1e6) × (0.7 × decay(B) + 0.3), where decay(B) = 1 / (1 + B/12).

- **A**: min installs (from Play Store).
- **B**: app age in months (from release or last update).
- High installs + low age are favored.

The tool computes and sorts by X; you only need to present the table.
