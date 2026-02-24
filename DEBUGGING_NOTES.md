# 🛠️ Debugging & Database Reference Guide

This document serves as a quick-reference for common debugging tasks and database maintenance within the Task Manager application.

---

## 🔍 1. IDE Debugging (Antigravity & VS Code)

### Hover Evaluation
When your execution is paused at a breakpoint (the red dot), you can see the results of logic checks in real-time.
- **How to use**: Move your mouse over a variable or a logic expression (e.g., `selectedTaskIds.length > 0`). 
- **The Result**: A small popup will appear showing the current value or boolean result (`true`/`false`).

### Inline Values (Pro Tip)
To see values automatically written next to your code in faint gray text:
1. Open **Settings** (`Ctrl + ,`).
2. Search for `debug inline values`.
3. Set **Debug > Inline Values** to `on`.

---

## 🗄️ 2. Database Maintenance (PostgreSQL)

Use these commands in your `psql` terminal to manage the `files` or `tasks` tables.

### Connect to Database
```bash
psql -U task_user -d task_manager
```

### Deletion Commands
> **Important**: Always remember the semicolon (`;`) at the end of every command!

- **Delete a specific row**:
  ```sql
  DELETE FROM files WHERE id = 123;
  ```
- **Delete multiple rows by ID**:
  ```sql
  DELETE FROM files WHERE id IN (1, 2, 3);
  ```
- **Clear ALL rows in a table**:
  ```sql
  DELETE FROM files;
  ```
- **Wipe table and reset IDs (Truncate)**:
  This clears the table and makes the next inserted row start at ID `1`.
  ```sql
  TRUNCATE TABLE files RESTART IDENTITY;
  ```

### 🚩 Troubleshooting: Foreign Key Errors
If you see an error like: `ERROR: cannot truncate a table referenced in a foreign key constraint`, it means other tables depend on the data you are trying to delete.

**The Fix (CASCADE)**:
Add `CASCADE` to the end of your command to automatically clear the dependent tables as well:
```sql
TRUNCATE TABLE github_integrations RESTART IDENTITY CASCADE;
```
*⚠️ Caution: This will delete data in all related tables (e.g., deleting integrations will also delete their repositories).*


TRUNCATE TABLE users RESTART IDENTITY CASCADE;
TRUNCATE TABLE projects RESTART IDENTITY CASCADE;
TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;
TRUNCATE TABLE files RESTART IDENTITY CASCADE;
TRUNCATE TABLE github_integrations RESTART IDENTITY CASCADE;
TRUNCATE TABLE github_repositories RESTART IDENTITY CASCADE;

---

## 📤 3. Viewing `FormData` Contents

`FormData` objects look empty when logged directly (`console.log(formData)`). Use these methods to inspect them:

### A. The "Spread" Method (Fastest)
```javascript
console.log("FormData Content:", [...formData.entries()]);
```

### B. The `forEach` Loop
```javascript
formData.forEach((value, key) => {
  console.log(`${key}:`, value);
});
```

### C. Network Tab (No Code Required)
The most reliable way to See exactly what the server receives:
1. Open **Browser DevTools** (`F12`).
2. Go to the **Network** tab.
3. Trigger the upload.
4. Click the `POST /api/files` request.
5. Check the **Payload** (or **Request**) tab.

---

## 📁 4. Project File Structure
- **Client Components**: `client/src/components/`
- **Server API**: `server/app.js`
- **Database Logic**: `server/database.js`
- **Uploads Storage**: `server/uploads/` (or S3)

---

## 📁 5. File Path Generation (Multer)

The `file_path` stored in the database (e.g., `uploads/2026/02/1771795013106-27...pdf`) is built in two parts within `middleware/upload.js`:

### A. Folder Destination
- **Logic**: Uses the current date to create a nested structure.
- **Structure**: `uploads/YYYY/MM/`
- **Goal**: Prevents a single folder from becoming too cluttered and slow.

### B. Unique Filename
- **Logic**: `Timestamp + Dash + Random Hex + Original Extension`
- **Structure**: `1771795013106` (Date.now) + `-` + `272353...` (8 random bytes) + `.pdf`
- **Goal**: Ensures no two files ever have the same name, even if they were uploaded at the same time.

### C. Normalization (Windows Fix)
Since Windows uses backslashes (`\`) for folders, the server normalizes the path in `app.js` before saving it to the database:
```javascript
filePath = req.file.path.replace(/\\/g, '/');
```
*This ensures the path works as a valid URL for the browser to download later.*
