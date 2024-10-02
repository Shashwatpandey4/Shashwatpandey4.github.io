---
title: Apache Iceberg - Introduction & Setup
author: Shashwat Pandey
date: 2024-10-01 17:00:00 +0800
categories: []
tags: []

---

# Apache Iceberg : Introduction & Setup

![alt](/assets/img/iceberg.webp)


#### **What is a Data Lake?**
   A data lake is a centralized repository that allows you to store all your structured and unstructured data at any scale. Unlike databases or data warehouses, a data lake can hold raw, unprocessed data in its original format. This makes it ideal for big data analytics, machine learning, and real-time data insights.

### **Why Not Just Use Cloud Storage or a Warehouse?**

Cloud Storage (e.g., AWS S3, Azure Blob Storage):
Cloud storage services are cost-effective for storing raw data, but they fall short when it comes to efficiently querying or analyzing that data. For instance, a company like Netflix may store terabytes of raw viewing data on S3, but running analytics directly on S3 data becomes complex and slow due to the lack of schema enforcement and optimizations. Without proper indexing or partitioning, reading data from S3 can lead to scanning large amounts of unnecessary data, making queries inefficient and costly.

Example: Imagine a retail company storing clickstream data on S3. If they want to analyze user behavior over time, they’d need to sift through unstructured logs. Without any indexing or schema, this process would be resource-intensive and slow, involving a lot of redundant data processing for every query.

Data Warehouse (e.g., Snowflake, Redshift):
Data warehouses are excellent for structured, processed data. They offer fast query performance and advanced analytics. However, as the volume and variety of data grow, costs can skyrocket. For example, a logistics company like FedEx may use Redshift to analyze structured shipment data. But if they want to integrate unstructured IoT data from their delivery vehicles—GPS logs, sensor readings—into the warehouse, it would require complex ETL (Extract, Transform, Load) processes. This increases costs and reduces flexibility when new data sources need to be incorporated quickly.

Example: A media company uses Snowflake to analyze transactional data (e.g., subscriptions, payments), but they also have large volumes of unstructured data such as video logs and social media mentions. Storing and analyzing all that unstructured data in Snowflake would not only be inefficient but also extremely costly, as it would need to be transformed into a structured format first.

### **The Data Lake Solution**
Data lakes provide the flexibility to store both structured and unstructured data in its raw form.

Example:
Imagine a company like Uber storing various types of data:

**Cloud Storage (AWS S3):** Uber might use S3 to store logs, CSV files with ride data, JSON files with driver information, and even images or videos from dashcams. While this works for storage, querying or analyzing this data directly would be slow and inefficient. If they wanted to analyze driver performance, they’d have to manually filter through vast amounts of raw data, which isn’t optimized for querying.

**Data Lake (with Apache Iceberg):** In a data lake, Uber can store all this data in one place, but with Iceberg’s table format, it becomes more structured and queryable. For example, they can store ride data in an Iceberg table that allows for schema enforcement and efficient querying, making it easy to analyze driver performance without dealing with the complexity of raw file formats. Iceberg organizes this data so that analytics tools can access it quickly and reliably, even as the data grows over time.

In essence, a data lake enables flexibility in data storage, and with Iceberg, it introduces the governance and efficiency needed for large-scale analytics.

#### **What is an Open Table Format?**
   An open table format is a specification that dictates how data is stored and accessed in a data lake. It ensures that your data is organized, queryable, and can evolve over time without breaking compatibility. Open table formats, like Apache Iceberg, enable ACID transactions, schema evolution, and time travel, all while being independent of any single vendor or technology.


- **Before Iceberg**:  
  Imagine a company like **Netflix** using a traditional data lake with **Hive Metastore** to manage their metadata. They store massive amounts of viewing history, user data, and content metadata. However, managing this data becomes a challenge because:
  - **Schema Evolution Issues**: If Netflix wanted to add new data fields, like user preferences, they couldn’t do so easily. Changing the schema meant downtime or complex workarounds, causing disruptions.
  - **No ACID Transactions**: Without support for ACID (Atomicity, Consistency, Isolation, Durability) transactions, updating or deleting records was risky, potentially leading to data corruption. If two teams tried to modify the same dataset, there could be inconsistencies or failed operations.
  - **Partitioning Bottlenecks**: Query performance was slow because partitioning strategies in Hive were manual and often inefficient. For example, queries on historical viewing data could take too long, as Hive couldn’t optimize them well for fast lookups.


### **After Apache Iceberg**

- **With Iceberg**:  
  Now, Netflix implements Iceberg as its open table format. This brings several improvements:
  - **Schema Evolution**: They can easily add new fields like user preferences without breaking existing data or requiring downtime. Iceberg manages schema changes smoothly, allowing Netflix to adapt to evolving data needs.
  - **ACID Transactions**: Netflix can safely update, insert, or delete records without worrying about data corruption. ACID transactions ensure consistent and reliable data, even when multiple teams are accessing the same dataset.
  - **Efficient Partitioning**: Iceberg automatically handles partitioning under the hood, allowing Netflix to run faster queries. For example, querying historical viewing data becomes more efficient with Iceberg's hidden partitioning, reducing the time to get insights from their data lake.


#### **What is Apache Iceberg and What Has It Changed?**
   Apache Iceberg is an open-source table format specifically designed to tackle the limitations of traditional data lakes. It introduced:
   - **Schema evolution**: Modify schemas without downtime.
   - **Partitioning without pitfalls**: Simplifies partitioning strategies for performance without requiring deep knowledge of the underlying data.
   - **Time Travel and Snapshots**: Allows users to query data as it existed at any point in time.
   - **ACID Transactions**: Provides consistency, isolation, and durability for data writes.
   These features make Iceberg suitable for modern analytics and batch processing.

#### **Who Uses Apache Iceberg?**
   Companies like **Netflix**, **Apple**, and **LinkedIn** use Apache Iceberg to handle their data lakes at massive scales. Netflix, for example, uses Iceberg to store petabytes of data, enabling faster and more efficient data querying and analysis.


#### **When Should You Use Apache Iceberg?**

Iceberg is particularly useful in the following scenarios:

- **When Dealing with Huge Data Volumes**:  
  If your data lake holds **terabytes to petabytes** of data, as seen in industries like e-commerce (e.g., **Amazon**) or streaming services, using Iceberg can significantly improve query performance and manageability. In these environments, the amount of data ingested daily can be enormous—Amazon’s clickstream data or user purchasing patterns, for instance—making Iceberg’s efficient querying, time travel, and schema management essential.

- **When Schema Evolution is Important**:  
  Over time, data models tend to evolve. Let’s say **Stripe** introduces new fields to their payment processing system, such as additional fraud detection fields. Iceberg allows them to modify schemas without requiring downtime or breaking previous datasets. This flexibility is crucial for companies dealing with complex, evolving data models and ensures that new business requirements don’t impact existing data analysis.

- **When Time Travel is Needed**:  
  In industries such as finance or healthcare, the ability to query past datasets is crucial for **regulatory compliance**. For example, a **financial institution** might need to run an audit and access last year's transaction data exactly as it existed back then. Iceberg’s time travel feature makes this possible without the need for complex backup and restore processes. Similarly, for **machine learning** teams, time travel can be used to compare training data from previous models with current data, enhancing the accuracy and effectiveness of predictions.

- **When You Need Strong Data Governance**:  
  In data-sensitive environments like **healthcare** (e.g., **Medtronic** or **Cerner**), where data integrity and governance are critical, Iceberg’s support for ACID transactions ensures that all reads and writes are consistent. For example, if multiple teams are working on patient data, Iceberg ensures that updates are accurate and don’t corrupt the database, even if transactions are happening simultaneously.


- **Without Iceberg**:  
  You may face challenges managing **massive datasets** in raw cloud storage or traditional data lakes—slow queries, schema management issues, and data corruption risks.
  
- **With Iceberg**:  
  You can manage **petabytes of structured and unstructured data** seamlessly, efficiently query it in real-time, and ensure your data lake has robust governance with features like **ACID transactions**, **schema evolution**, and **time travel**. This is critical for use cases ranging from audit trails in finance to fast-moving analytics in e-commerce.


