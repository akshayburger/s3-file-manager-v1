# s3-file-manager
# ☁️ S3 File Manager Simulator

A functional web-based simulation of **Amazon S3 (Simple Storage Service)** created as an individual student assignment.

The application demonstrates the core concepts of S3 object storage through a simple and interactive file-management interface.

## 🌐 Live Demo

**Deployment:** Netlify

> (https://awssimulation.netlify.app/)

---

## 📌 Project Overview

Amazon S3 is an object storage service provided by AWS that allows users to store and retrieve files and other digital objects.

This project simulates the basic workflow of an S3 storage bucket without connecting to an actual AWS account.

Users can:

- Upload files as simulated S3 objects
- View objects stored in the bucket
- Search for objects
- Filter objects by file type
- Delete individual objects
- Clear the entire bucket
- Monitor simulated storage usage

---

## ⭐ Enhancement: Smart Storage Management

The project introduces **Smart Storage Management & Analytics** as an enhancement beyond the basic S3 simulation.

The enhancement automatically:

- Calculates storage utilization
- Identifies the largest object in the bucket
- Displays storage health
- Warns users when storage usage becomes high
- Provides storage optimization recommendations

A **70% storage threshold** is used to trigger an optimization warning.

This helps users understand how their stored objects affect available storage capacity.

---

## 🌙 Additional UI Enhancement

The application also includes a **Dark Mode / Light Mode toggle**.

The selected theme is saved using browser `localStorage`, so the user's preference remains after refreshing the page.

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript
- Browser Local Storage
- Responsive Web Design

No backend server or AWS credentials are required.

---

## ☁️ AWS Service Simulated

### Amazon S3

The following S3 concepts are simulated:

| S3 Concept | Project Implementation |
|---|---|
| Bucket | `student-storage-bucket` |
| Objects | Uploaded files |
| Object storage | Browser-based simulation |
| Upload | Upload Object button |
| Object listing | Objects section |
| Object deletion | Delete button |
| Storage monitoring | Storage Analytics |
| Storage management | Smart Storage Enhancement |

---

## 🔄 Application Workflow

```text
User selects a file
        ↓
File is uploaded
        ↓
File becomes a simulated S3 Object
        ↓
Object is displayed in the bucket
        ↓
Storage analytics are updated
        ↓
Smart Storage analyzes the bucket
        ↓
User can search, filter or delete objects
```

---

## 💡 Key Features

### Object Management
- Upload objects
- List objects
- Delete objects
- Clear bucket

### Search & Filtering
- Search by file name
- Filter by Images
- Filter by Documents
- Filter by Other file types

### Storage Analytics
- Total object count
- Storage used
- Image count
- Document count
- Storage percentage
- Storage capacity progress bar

### Smart Storage Management
- Largest object detection
- Storage health monitoring
- 70% capacity warning
- Optimization recommendations

### User Interface
- Responsive design
- Dark mode
- Light mode
- Interactive notifications
- AWS-inspired interface

---

## 💾 Data Storage

The project uses the browser's **Local Storage API** to simulate persistent S3 bucket data.

This allows uploaded object information to remain available even after refreshing the page.

No actual files are uploaded to Amazon S3.

---

## 🚀 Running Locally

1. Download or clone the repository.

2. Open the project folder.

3. Open:

```text
index.html
```

in a web browser.

No installation or server setup is required.

---

## 📁 Project Structure

```text
s3-file-manager/
│
├── index.html      # Website structure
├── style.css       # Styling and responsive design
├── script.js       # Application functionality
└── README.md       # Project documentation
```

---

## 🎓 Assignment Information

**Assignment:** AWS Service Simulation & Enhancement

**AWS Service:** Amazon S3

**Type:** Individual Student Assignment

**Core Functionality:** S3 Object Storage Simulation

**Enhancement:** Smart Storage Management & Analytics

**Additional UI Enhancement:** Dark Mode

---

## ⚠️ Disclaimer

This project is an educational **simulation of Amazon S3**.

It does not connect to or store data in an actual AWS S3 bucket.

The purpose of the project is to demonstrate understanding of the working principles and practical application of the AWS service.
