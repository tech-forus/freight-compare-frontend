# My Vendors Feature

This feature allows users to view and manage their added vendors.

## Features

### 1. Vendor List View
- Displays all vendors added by the user
- Shows vendor details including company name, contact info, location, and rating
- Card-based layout for easy browsing
- Shows creation date for each vendor

### 2. Vendor Management
- **Edit Vendor**: Click the "Edit" button to modify vendor details
- **Delete Vendor**: Click the "Delete" button to remove a vendor
- **Add New Vendor**: Link to the Add Vendor page for adding new vendors

### 3. Edit Modal
- Comprehensive form for editing vendor information
- Fields include:
  - Company Name
  - Vendor Code
  - Phone Number
  - Email Address
  - GST Number
  - Transport Mode
  - Address
  - State, City, Pincode
  - Rating (1-5 stars)
  - Sub Vendor information

## API Endpoints

### Get User's Vendors
```
GET /api/transporter/gettemporarytransporters?customerID={userID}
```

### Update Vendor
```
PUT /api/transporter/update-vendor/{vendorID}
Content-Type: application/json

{
  "companyName": "Updated Company Name",
  "vendorCode": "VENDOR001",
  "vendorPhone": "+91-9876543210",
  "vendorEmail": "vendor@example.com",
  "gstNo": "29ABCDE1234F1Z5",
  "mode": "Road",
  "address": "123 Business Street",
  "state": "Maharashtra",
  "city": "Mumbai",
  "pincode": "400001",
  "rating": 5,
  "subVendor": "Sub Vendor Name",
  "selectedZones": ["NORTH", "SOUTH"]
}
```

### Delete Vendor
```
DELETE /api/transporter/remove-tied-up
Content-Type: application/json

{
  "customerID": "userID",
  "companyName": "Company Name to Delete"
}
```

## Navigation

The "My Vendor" link in the user dropdown now points to `/my-vendors` instead of `/addtransporter`.

## Usage

1. **Access**: Click on "My Vendor" in the user dropdown menu
2. **View Vendors**: See all your added vendors in a card layout
3. **Edit Vendor**: Click "Edit" on any vendor card to modify details
4. **Delete Vendor**: Click "Delete" to remove a vendor (with confirmation)
5. **Add New Vendor**: Use the "Add Vendor" button to add more vendors

## Error Handling

- Loading states for API calls
- Error messages for failed operations
- Confirmation dialogs for destructive actions
- Toast notifications for success/error feedback

## Security

- All vendor operations require user authentication
- Users can only view/edit their own vendors
- Protected routes ensure only authenticated users can access the feature
