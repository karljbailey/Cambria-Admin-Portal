# Client Page Debug Guide

## Issue Description
The `/client/WON` page shows the folderId and name but not the monthly report or folder content.

## 🔍 **Debugging Steps**

### **1. Check Browser Console**
Open your browser's developer tools (F12) and check the Console tab for any errors or debug logs.

**Look for these console logs:**
```
🔍 Starting fetchClient: { clientCode: "WON", user: "user-id" }
🔍 Client search result: { foundClient: true, clientCode: "WON", availableClients: [...] }
✅ Access granted for client: WON
```

**Common errors to look for:**
- Authentication errors
- API fetch failures
- Permission denied errors
- Google Drive API errors

### **2. Check Network Tab**
In the Network tab of developer tools, look for:
- `/api/clients?userId=...` - Should return 200 with client data
- `/api/folder/{folderId}` - Should return 200 with folder items
- `/api/file/{fileId}` - Should return 200 with report data

### **3. Verify Environment Variables**
Check if these environment variables are set in `.env.local`:

```bash
# Google Drive API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_ID=your-spreadsheet-id

# Firebase (for user authentication)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
```

### **4. Test API Endpoints Manually**

#### **Test Clients API:**
```bash
# This will fail without authentication - that's expected
curl "http://localhost:3000/api/clients"
```

#### **Test Folder API:**
```bash
# Replace {folderId} with the actual folder ID from the client
curl "http://localhost:3000/api/folder/{folderId}"
```

### **5. Check User Permissions**
The issue might be related to user permissions:

1. **Are you logged in?** - Check if you're authenticated
2. **Do you have access to the WON client?** - Check user permissions
3. **Are you an admin?** - Admin users have access to all clients

### **6. Check Google Drive Structure**
The expected folder structure should be:

```
Client Root Folder (folderId)
├── 2024-01/
│   ├── Monthly-Report-2024-01.csv
│   └── other files...
├── 2024-02/
│   ├── Monthly-Report-2024-02.csv
│   └── other files...
└── other folders...
```

**Requirements:**
- Monthly folders must be named `YYYY-MM` format (e.g., `2024-01`)
- Report files must contain "monthly-report" in the filename (case-insensitive)
- Files must be CSV, Excel (.xlsx), or Google Sheets

### **7. Debug the Data Flow**

#### **Step 1: Client Data**
- ✅ Client exists in the system
- ✅ User has permission to access the client
- ✅ Client has a valid folderId

#### **Step 2: Folder Data**
- ✅ Folder API can access the Google Drive folder
- ✅ Folder contains items (files and subfolders)
- ✅ Monthly folders are found (YYYY-MM format)

#### **Step 3: Monthly Reports**
- ✅ Monthly folders contain report files
- ✅ Report files have "monthly-report" in the name
- ✅ File API can process the report files
- ✅ Report data is parsed correctly

### **8. Common Issues and Solutions**

#### **Issue: "No data found in folder"**
**Possible causes:**
- Google Drive API not configured
- Folder ID is incorrect
- Folder is empty
- Permission issues with Google Drive

**Solutions:**
1. Check environment variables
2. Verify folder ID in the client data
3. Check Google Drive permissions
4. Ensure the service account has access to the folder

#### **Issue: "No monthly reports"**
**Possible causes:**
- No folders with YYYY-MM naming
- Report files don't contain "monthly-report" in the name
- Files are in unsupported format

**Solutions:**
1. Check folder naming convention
2. Verify report file names
3. Ensure files are CSV, Excel, or Google Sheets

#### **Issue: "No report found for selected month"**
**Possible causes:**
- Report file exists but can't be parsed
- File API errors
- Permission issues with specific files

**Solutions:**
1. Check file format and content
2. Verify file API can access the file
3. Check browser console for file processing errors

### **9. Manual Testing Steps**

1. **Navigate to the client page:** `http://localhost:3000/client/WON`
2. **Check browser console** for debug logs
3. **Check network tab** for API calls
4. **Verify client data** is loaded
5. **Check folder content** is displayed
6. **Look for monthly folders** in the folder list
7. **Click on a monthly folder** to see its contents
8. **Check if report files** are listed
9. **Verify monthly reports** section shows data

### **10. Environment-Specific Debugging**

#### **Development Environment:**
- Check `.env.local` file exists
- Verify all environment variables are set
- Ensure development server is running

#### **Production Environment:**
- Check environment variables in deployment platform
- Verify Google Drive API quotas
- Check Firebase configuration

### **11. API Response Examples**

#### **Expected Clients API Response:**
```json
{
  "clients": [
    {
      "folderId": "1ABC123...",
      "clientCode": "WON",
      "clientName": "Won Client",
      "fullName": "Won Client Full Name",
      "active": true
    }
  ]
}
```

#### **Expected Folder API Response:**
```json
{
  "items": [
    {
      "id": "1DEF456...",
      "name": "2024-01",
      "mimeType": "application/vnd.google-apps.folder",
      "webViewLink": "https://drive.google.com/..."
    },
    {
      "id": "1GHI789...",
      "name": "Monthly-Report-2024-01.csv",
      "mimeType": "text/csv",
      "webViewLink": "https://drive.google.com/..."
    }
  ]
}
```

### **12. Next Steps**

1. **Check browser console** for specific error messages
2. **Verify environment variables** are correctly set
3. **Test API endpoints** manually
4. **Check Google Drive folder structure**
5. **Verify user permissions**
6. **Look for file format issues**

If you're still having issues, please share:
- Browser console errors
- Network tab API responses
- Environment variable configuration (without sensitive data)
- Google Drive folder structure

