<!-- converted from TECHNOCYCLE CORPORATION_TECHNOSYS_CHP1-3.docx -->


POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
TechnoSys: A CROSS-PLATFORM GEOFENCED IMS FOR  HUMAN RESOURCES, SERVICE TICKETING, AND INVENTORY  CONTROL
A System Study Presented to the
Polytechnic University of the Philippines, San Pedro Campus
In Partial Fulfillment
of the Requirements for the Course Capstone Project 1
By
Adarayan, Andrew V.
Almajar, Christine Joy A.
Berdin, Jireh Gilbert D.
Ferreras, Nherie Anne D.
Gozo, Glori John F.
Ranara, Cristina C.
January 2026
1

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
TABLE OF CONTENTS
TechnoSys: A CROSS-PLATFORM GEOFENCED IMS FOR HUMAN RESOURCES,  SERVICE TICKETING, AND INVENTORY CONTROL.................................................. 1
TABLE OF CONTENTS................................................................................................. 2 THE PROBLEM AND ITS SETTING.............................................................................. 4 Introduction................................................................................................................. 4 Background of the Study............................................................................................. 6 Theoretical Framework ............................................................................................... 8 Conceptual Framework..............................................................................................11 Statement of the Problem ..........................................................................................13 Scope and Delimitation of the Study ..........................................................................15 Significance of the Study............................................................................................17 Definition of Terms.....................................................................................................18 REVIEW OF RELATED LITERATURE AND STUDIES ................................................20 The Evolution of Integrated Web-Based Information Systems....................................20 Human Resource Information Systems and Workforce Management ........................21 Biometric Technology, Attendance Monitoring, and Workforce Accountability............23 Service Request Dynamics and Digital Ticketing Systems.........................................24 Modernizing Inventory and Procurement Control .......................................................25 Data Privacy, Security, and Inter-Branch Synchronization .........................................26 Software Quality Assurance: The ISO/IEC 25010 Framework....................................27 Synthesis of the Reviewed Literature and Studies .....................................................29 METHODOLOGY..........................................................................................................31 Research Design .......................................................................................................31 Iterative SDLC Model.................................................................................................31 Iteration Process........................................................................................................32 Explanation of the Iterative Phases............................................................................32 Planning .................................................................................................................32 Analysis..................................................................................................................32 Design....................................................................................................................32
2

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Implementation.......................................................................................................33 Testing ...................................................................................................................33 Evaluation and Maintenance ..................................................................................33
Technical Requirements ............................................................................................34 REFERENCES..............................................................................................................37
3

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Chapter 1
THE PROBLEM AND ITS SETTING
Introduction
Digital transformation has become an essential component of modern business  operations, enabling organizations to improve efficiency, accuracy, and workforce  management through the integration of technology. As industries continue to adapt to fast changing operational demands, companies are increasingly adopting digital systems to  automate administrative processes and support data-driven decision-making. One of the  most widely implemented technologies in organizational management is the Human  Resource Information System (HRIS), which combines human resource management  functions with information technology to streamline employee-related processes such as  attendance monitoring, payroll processing, records management, and performance  evaluation.
Traditional attendance management methods, including paper-based logs, manual  encoding, and conventional timekeeping systems, often result in inaccurate records, time  theft, proxy attendance, delayed payroll processing, and inefficient workforce monitoring.  Furthermore, traditional service dispatching and manual inventory tracking often lead to  delayed ticket resolutions, missing equipment, and inaccurate stock levels, directly  impacting customer satisfaction and service delivery. These challenges become more  significant in companies with field-based operations and mobile employees who work  across multiple project sites. To address these limitations, organizations are now  integrating advanced technologies such as biometric authentication and geofencing into  HRIS platforms to strengthen workforce monitoring and improve operational efficiency.
Biometric technology enhances attendance accuracy by using unique physical
4

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
characteristics, such as fingerprints or facial recognition, to verify employee identity.  Meanwhile, geofencing technology uses location-based services and Global Positioning  System (GPS) technology to restrict attendance logging within authorized work areas. The  integration of these technologies into a cross-platform HRIS creates a more secure,  reliable, and automated attendance management system that minimizes fraudulent  attendance practices while improving real-time workforce tracking and administrative  efficiency.
Technocycle Corporation, a company specializing in the sales, design, installation,  and maintenance of air conditioning and refrigeration systems, operates in a highly  dynamic service environment where employees are frequently deployed to different  project locations. Due to the nature of its operations, monitoring employee attendance and  managing workforce deployment through manual methods can become inefficient and  prone to errors. The company requires a modernized system capable of accurately  recording employee attendance, validating employee identity, and monitoring workforce  location in real time.
In response to these operational challenges, this study proposes “TechnoSys: A  Cross-Platform Geofenced Integrated Management System (IMS) for Human Resources,  Service Ticketing, and Inventory Control.” The system aims to integrate biometric  authentication and geofencing technology into a centralized HRIS platform accessible  across multiple devices. Through this implementation, the study seeks to improve  attendance reliability, enhance workforce monitoring, reduce administrative workload, and  support more efficient human resource operations within Technocycle Corporation.
Furthermore, this research aims to evaluate the effectiveness, usability, and  potential benefits of the proposed system in improving attendance management and
5

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
operational efficiency. The findings of this study may also serve as a reference for other  service-oriented companies seeking to modernize their workforce management practices  through technology-driven HR solutions.
Background of the Study
Technocycle Corporation is a company that provides heating, ventilation, air  conditioning, and refrigeration (HVAC/R) services, including system installation,  maintenance, fabrication, and technical support. Due to the nature of its operations, the  company relies heavily on a mobile workforce composed of technicians and field  personnel assigned across different project sites and branch locations. With a total  workforce of 31 employees distributed among the main branch and three sister branches,  monitoring employee attendance and managing workforce records have become  increasingly challenging.
Prior to the development of the proposed system, Technocycle Corporation utilized  traditional attendance monitoring methods, including manual logbooks and standalone  biometric devices that were not interconnected across branches. Because these systems  operated independently and lacked centralized data synchronization, attendance  monitoring became inefficient and vulnerable to inconsistencies. Incidents such as  inaccurate attendance recording, duplicate entries, delayed submission of attendance  reports, and unauthorized attendance logging or “buddy punching” became recurring  operational concerns.
The limitations of the existing system significantly affected the company’s payroll  processing and workforce management efficiency. Attendance records from different  locations had to be manually collected, verified, and consolidated before payroll
6

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
computation could begin. As a result, payroll processing frequently experienced delays,  causing employee dissatisfaction and negatively affecting workplace morale. In addition  to HR challenges, the company's service operations suffer from disconnected  communication. Service requests are handled through informal channels, making it  difficult to track technician deployment. Furthermore, manual inventory tracking frequently  results in stock discrepancies and delayed procurement, slowing down field operations.
Additionally, the absence of real-time attendance tracking made it difficult for management  to effectively monitor employee deployment, punctuality, and attendance compliance  across multiple work sites.
As technology continues to transform human resource management practices,  organizations are increasingly adopting integrated HRIS platforms enhanced with  biometric authentication and geofencing capabilities to improve attendance security and  workforce monitoring. Biometric authentication strengthens attendance validation by  verifying the identity of employees using unique biological characteristics such as  fingerprints or facial recognition. On the other hand, geofencing technology utilizes GPS  and location-based services to ensure that employees can only log attendance within  authorized work locations. The integration of these technologies minimizes fraudulent  attendance practices while improving the reliability and accuracy of attendance records.
In response to these operational challenges, the researchers propose  “TechnoSys: A Cross-Platform Geofenced Integrated Management System (IMS) for  Human Resources, Service Ticketing, and Inventory Control.” The proposed system is  designed to provide a centralized and automated attendance management solution  accessible through both web and mobile platforms. By integrating geofencing and  biometric technologies into the HRIS, the system aims to improve attendance accuracy,
7

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
strengthen workforce monitoring, streamline payroll preparation, and enhance overall  operational efficiency within Technocycle Corporation.
This study seeks to determine how the implementation of the proposed system  can address the company’s current attendance management issues and contribute to  more efficient human resource operations. Furthermore, the study aims to provide insights  into the effectiveness of technology-driven attendance management systems for service
oriented companies with mobile and field-based workforces.
Theoretical Framework
The theories and models used in this research will explain how integrated  business processes are managed through the use of information systems and how  software quality is assured using these systems.
Information Systems Theory
Laudon and Laudon (2022) define the Information Systems Theory as the way  that data is collected, processed, stored, and transformed into valuable information to  assist businesses in making decisions. For the purpose of this study, service requests,  inventory transactions, procurement records, and invoices will provide input for  processing into a service ticket, inventory balance, procurement status, and invoice  report. It moves beyond seeing technology as mere hardware or software, instead  defining it as a socio-technical solution where data is systematically collected,  processed, and stored to be transformed into actionable intelligence.
The Input-Process-Output (IPO) model, which serves as the study's structural  foundation, is the central mechanism of this theory. The gathering of unstructured, raw
8

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
data from the environment, such as individual service requests, inventory counts, or  purchase records, is represented by the "Input" phase. These are just discrete numbers  and names in the absence of a theoretical context. But the system's internal logic sorts,  computes, and relates these inputs during the "Process" stage. For example, the theory  outlines how processing a service request must automatically initiate a check against  procurement status and inventory levels to ensure data integrity throughout the entire  business.
The delivery of changed data to the stakeholders that require it, such as a  finalized invoice report or a thorough inventory balance, is the "Output" at the end. The  use of Feedback Loops is what makes IST so important for this study. This theoretical  element guarantees that the system monitors performance in addition to "outputting"  data. In the end, information systems theory offers the scholarly rationale for digital  transformation, demonstrating that data becomes the most effective instrument for long term success and corporate transparency when it is handled as a structured lifecycle.
Service Management Theory
The Service Management Theory focuses on the need to effectively plan,  coordinate, and deliver services to achieve customer satisfaction (Grönroos, 2021). The  proposed service ticketing system will also support the Service Management Theory by
allowing for the organization of service requests, assignment of technicians, tracking of  service delivery, and accurate and efficient inventory management. This theory argues  that a service-gap often exists when a company’s internal processes are disconnected  from the customer's expectations. This research addresses that gap by using the
proposed ticketing system to bridge the divide between office coordination and field
9

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
execution. According to the theory, every service request is a moment of truth where the  company must prove its competence. By organizing these requests digitally, the system  ensures that the assignment of technicians is based on real-time availability and skill,  rather than guesswork. This theoretical alignment ensures that the service delivery is not  just completed but is executed with a level of precision that manual systems cannot  provide.
Service Management Theory provides the academic justification for why a fully  integrated solution is necessary. It argues that for a multi-service technical firm,  satisfaction is a result of a synchronized service ecosystem where information flows  effortlessly from the customer's initial request to the final invoice. By adopting this theory,  the study demonstrates that the web-based system is not just a tool for tracking work,  but a strategic asset designed to maximize the value of every customer interaction.
ISO 25010 Software Quality Model
The ISO 25010 Software Quality Model represents the basis for determining the  software quality of the system to be developed as defined by ISO/IEC (2023). The ISO  25010 Software Quality Model defines the key software quality characteristics as  functional usability, reliability, and efficient execution. The following criteria will be used  to assess the success of implementing an integrated web-based system. This research  focuses on four critical pillars: Functional Suitability, which ensures the system meets the specific technical needs of the organization; Usability, which assesses the user friendliness and "cognitive load" for both office staff and field technicians; Reliability,  which evaluates data integrity and the system's ability to maintain consistent records;  and Performance Efficiency, which measures responsiveness and processing speed.
10

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
By adopting the ISO 25010 framework, this research moves beyond basic development  and enters the realm of rigorous software quality assurance. It provides the academic  evidence needed to prove that the integrated system is a robust, reliable, and efficient corporate asset capable of supporting high-stakes technical demands. This model  ensures that the software is not just a tool for tracking work, but a professionally  engineered solution that meets international standards for excellence.
Conceptual Framework
The conceptual framework of this study uses the Input-Process-Output (IPO)  model to present the flow of the research. This framework shows how the identified  administrative and operational problems of Technocycle Corporation are addressed  through the proposed integrated web-based system to improve operational efficiency  and employee management.
Figure 1. Input-Process-Output (IPO) Model
11

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Input (The Independent Variables)
The Input stage categorizes the specific elements of Technocycle Corporation  that the study aims to evaluate:
● Attendance and time-tracking data from manual logbooks and fragmented systems  prone to discrepancies
● Service request records currently handled through informal methods ● Inventory records and stock level data
● Procurement records and supplier information
● User feedback from employees and management regarding current processes and  system expectations
Process (The Methodological Integration)
The Process stage involves the following analytical and technical actions: ● Digitization and centralization of attendance monitoring
● Implementation of a structured service request ticketing system
● Automation of inventory tracking and stock level monitoring
● Integration of procurement order management
● System evaluation using ISO 25010 metrics to assess Functional Suitability,  Usability, Reliability, and Performance Efficiency
Output (The Dependent Variables)
The Output stage represents the expected results of the proposed integrated  system:
● Optimized operational efficiency and streamlined administrative processes
12

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
● Centralized data management across human resources, service operations,  inventory, and procurement
A formal set of proposed enhancements or policies to further optimize the system's utility  for the corporation.
Statement of the Problem
The primary objective of this study is to develop and evaluate “TechnoSys: A  Cross-Platform Geofenced Integrated Management System (IMS) for Human  Resources, Service Ticketing, and Inventory Control” for Technocycle Corporation.  Specifically, the study aims to determine how the integration of geofencing and biometric  technology into a centralized Human Resource Information System (HRIS) can improve  attendance monitoring, workforce management, and operational efficiency within the  organization.
To achieve this objective, the study seeks to answer the following questions: 1. What are the existing challenges encountered by Technocycle Corporation in its  current attendance and workforce management system in terms of: 1.1 Attendance monitoring and recording;
1.2 Payroll preparation and processing;
1.3 Workforce monitoring across multiple branches and project sites; 1.4 Security and accuracy of attendance data;
13

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
1.5 Service request tracking and technician deployment; and
1.6 Inventory control and procurement processing?
2. What features and functionalities should be developed in the proposed TechnoSys  HRIS in terms of:
2.1 Biometric attendance authentication;
2.2 Geofencing and GPS-based attendance validation;
2.3 Cross-platform accessibility;
2.4 Attendance and payroll management;
2.5 Employee records management;
2.6 Service ticketing and deployment tracking; and
2.7 Inventory and procurement automation?
3. How effective is the proposed system in improving workforce attendance  management in terms of:
3.1 Accuracy of attendance records;
3.2 Prevention of unauthorized attendance logging or “buddy punching”; 3.3 Efficiency of attendance tracking and monitoring;
3.4 Timeliness of payroll preparation;
3.5 Accessibility and usability of the system;
3.6 Speed of service ticket resolution; and
3.7 Accuracy of inventory stock levels?
4. How do the employees and management evaluate the proposed TechnoSys HRIS in  terms of:
4.1 Functionality;
4.2 Reliability;
14

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
4.3 Ease of use;
4.4 Security; and
4.5 Overall user satisfaction?
5. Based on the findings of the study, what enhancements and recommendations can  be proposed to further improve the functionality and implementation of the system?
Scope and Delimitation of the Study
Scope
This study focuses on the design and development of a fully integrated web based system for Technocycle Corporation's main branch located in Pacita, San Pedro,  Laguna.
The system aims to enhance both human resource management and operational  processes by automating tasks that were previously performed manually or through  disconnected methods.
The system will cover all employees of the company, including technicians,  helpers, supervisors, service staff, and management personnel. It will manage employee  data, attendance records, and personnel files. Additionally, the system will handle  service request tracking, inventory monitoring, and procurement processing. Key features of the system include:
● Automated attendance monitoring integrated with biometric authentication
15

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
● Employee profiles and records management, including digital 201 files, employee  status, and certifications
● Service request ticketing, assignment, and status tracking
● Inventory management with stock level monitoring and alerts
● Procurement request and order processing
● Forms and file uploads for HR-related approvals
● Communication tools, including messaging, announcements, company calendar,  and notifications
● Performance evaluation and complaint submission, including an anonymous  complaint feature
● Role-based access control for security and data integrity
The system aims to streamline administrative and operational tasks, improve  data accuracy, and provide employees and management with a centralized platform for  company processes.
Delimitations
This study is limited to the HR processes, service operations, inventory  management, and procurement processing of Technocycle Corporation's main branch  only. The system will not cover customer management, accounting, financial reporting,
or marketing functions. While the integrated system will include all employees within the  main branch, it will not be implemented for the company's sister branches during this  capstone project.
16

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Although the system incorporates historical employee and inventory records, it  will rely on the accuracy and availability of existing data. Any discrepancies in past  records may affect the initial performance of the system but will be addressed through  data validation during implementation.
Significance of the Study
The study is significant as it addresses the challenges faced by Technocycle  Corporation in managing its human resources and operations through manual and  fragmented processes. The integrated system implementation is expected to provide  benefits to various stakeholders:
● Employees. Employees can easily access their attendance records, profiles, and  work assignments through a centralized system, improving convenience and  communication.
● Human Resource Department. The system helps HR personnel automate  attendance monitoring, employee record management, and document  processing, reducing manual workload and errors.
● Supervisors and Department Heads. Supervisors can monitor employee  attendance, service requests, inventory status, and performance more efficiently,  supporting better decision-making and accountability.
● Service and Operations Team. Service staff can access work orders, update  ticket status, check inventory availability, and submit procurement requests  through the system, reducing communication delays and improving service  turnaround times.
17

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
● Management and Company Leadership. Company management can access  accurate and real-time operational data, helping improve planning, monitoring,  and overall operational efficiency.
● Future Research and System Development. This study may serve as a  reference for future research related to integrated management systems and  digital transformation in service-oriented companies.
Definition of Terms
For a better understanding of this study, the following terms are defined  conceptually and operationally:
201 File. The comprehensive folder or digital record containing an employee's  personal data, employment history, and pre-employment requirements. In this system, it  refers to the digitized management of these records to ensure security and easy  retrieval.
Attendance Monitoring. The systematic tracking of employee presence and  punctuality within the organization. In this study, it refers to the automation of this  process using biometric data to replace manual logbooks.
Biometric Authentication. The verification of employee identity using unique  physical characteristics, specifically fingerprints. This feature addresses the issue of  attendance fraud.
Centralized Database. A single, unified system storing all HR data, service  records, inventory information, and procurement orders. This serves as the solution to  the fragmented record keeping currently used by the company.
18

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Cross-Platform. The ability of a software application to run on multiple operating  systems or devices. For this study, it refers to the system’s accessibility via both web  browsers for office administrators and mobile applications for field technicians.
Employee Self-Service (ESS). A functionality that allows employees to access  their own profiles, view attendance records, and file requests without needing manual  intervention from HR staff.
Field Technician. An employee performing technical work on-site, such as the  installation, maintenance, or repair of air conditioning systems. This is a primary  respondent group of the study.
Geofencing. The use of GPS and location-based services to create a virtual  geographic boundary. In this study, it serves as an attendance validation tool that  restricts employees from clocking in or out unless they are physically within an  authorized work area or project site.
Human Resource Information System (HRIS). A digital system designed to  manage and automate HR tasks. In this study, it refers to the specific human resources  module within the overarching Integrated Management System (IMS) developed for  Technocycle Corporation, rather than a standalone application.
HVAC/HVAC-R. Heating, Ventilation, Air Conditioning, and Refrigeration  systems. This acronym defines the core service and industry context of Technocycle  Corporation.
Integrated Management System (IMS). A unified software platform that  consolidates multiple organizational processes into a single framework. Operationally, it  refers to TechnoSys, which combines human resources, service ticketing, and inventory  control into one centralized database for Technocycle Corporation.
19

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Inventory Control. The management of stock levels, including tracking of parts  and materials used in service operations to ensure availability and minimize shortages. Operational Efficiency. The company's ability to perform administrative and  operational tasks accurately, quickly, and with minimal errors. This is a primary  dependent variable of the study.
Procurement Processing. The management of purchase orders and supplier  coordination for acquiring materials and parts needed for service operations. Role-Based Access. A security feature that restricts system access based on the  user's position, ensuring that different user types have appropriate permissions. Service Ticketing. The digital mechanism within the IMS used for documenting,  assigning, and monitoring customer or internal service tasks from creation to completion. System Transparency. The clarity and accessibility of information to authorized  users, referring to the ability to view records and verify accuracy.
Time Theft. The act of misreporting work hours or bypassing attendance  systems. This is a specific operational problem the system aims to eliminate.
Chapter 2
REVIEW OF RELATED LITERATURE AND STUDIES
The Evolution of Integrated Web-Based Information Systems
The rapid advancement of information technology has fundamentally reshaped  how organizations manage both administrative and operational functions. Integrated  web-based information systems have evolved from being optional tools to becoming the  core operational backbone of modern service-oriented enterprises. According to Laudon  and Laudon (2022), an integrated system is a socio-technical solution that centralizes
20

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
data to provide a "single source of truth"—a concept critical for businesses like  Technocycle Corporation, which manages numerous interrelated operations spanning  human resources, service delivery, inventory usage, and procurement across multiple  branches. Similarly, Alshamrani et al. (2023) found that companies adopting integrated  platforms experienced significantly higher departmental transparency and a drastic  reduction in redundant data entry, demonstrating that integration directly counters the  inefficiencies caused by fragmented, siloed systems.
This shift is equally evident in the Philippine context. Salvador et al. (2024) found  that centralized online platforms allow Filipino enterprises to make faster, data-driven  decisions by consolidating diverse functional features into a unified monitoring  framework. Grepon et al. (2023) further noted that the use of Application Programming  Interfaces (APIs) and cloud-based solutions has become essential for providing users  with real-time responsiveness in dynamic operational environments. Zhang et al. (2024)  and Kumar and Bansal (2023) reinforced this by emphasizing that modularity and  scalability are the two most important architectural traits for modern web systems,  ensuring that a company's digital infrastructure can adapt as operations grow without  requiring a total system overhaul—a concern directly applicable to Technocycle's  expanding multi-branch structure.
Human Resource Information Systems and Workforce Management At the intersection of web-based integration and organizational management lies  the Human Resource Information System (HRIS). Bangura (2024) defines modern HRIS  as having evolved from simple record-keeping into a system that serves as a "Single  Source of Truth" for all workforce-related data. He emphasizes that companies must
21

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
move away from manual files and fragmented databases to avoid redundancy and  improve decision-making—an argument that directly mirrors the conditions at  Technocycle Corporation prior to its HRIS implementation, where disconnected  biometric systems and manual logbooks created vulnerabilities in data integrity.
The broader impact of HRIS on organizational performance is well-documented.  Chowdhury and Ahmed (2025) confirmed that HRIS plays a central role in decision making effectiveness for service-sector employees, while Savitri et al. (2024) found  through a systematic literature review that HRIS improves employee performance  management by enabling real-time visibility into workforce activity. Kumar et al. (2025)  specifically investigated HRIS adoption in the service sector and found a measurable  increase in workforce productivity, attributing it to the system's ability to free HR  personnel from repetitive manual tasks and allow them to focus on more strategic  responsibilities. Furthermore, Yasir Hussein and Ghorbel (2024) emphasized that the  core value of an HRIS lies in its function as a centralized database that makes  comprehensive employee information accessible to management regardless of physical  location—a capability particularly critical for Technocycle's distributed, field-based  workforce.
The adoption of HRIS is not without challenges, however. Vilma and Booshnam  (2025) found that organizational performance only improves once employees fully  accept the change, introducing "Change Management" as a crucial mediator in HRIS  success. They noted that resistance often stems from fear or lack of adaptability, and  that managing this human dimension is as important as the technical implementation  itself. Milhem et al. (2025), examining cloud-based HRM adoption in developing  countries through the Technology-Organization-Environment (TOE) framework, similarly
22

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
found that technological readiness and environmental pressure—not individual  preference—are the primary drivers of adoption, and that cloud-based systems offer the  cost-effectiveness and scalability that SMEs like Technocycle require.
Biometric Technology, Attendance Monitoring, and Workforce Accountability A principal challenge in managing a mobile, field-based workforce is ensuring the  integrity of attendance records. Hemavathi and Chakravarthi (2024) argued that  traditional methods such as paper logbooks are becoming obsolete due to their  susceptibility to "proxy attendance" or buddy punching—a practice where one employee  logs attendance on behalf of another. They identified biometric authentication,  specifically fingerprint scanning and facial recognition, as the most effective  countermeasure because it relies on unique physical characteristics that cannot be  transferred. Singh et al. (2024) reinforced this position, noting that biometric systems  create a reliable digital audit trail that ensures employees are held accountable for their  exact work hours.
The empirical impact of biometric authentication is supported by Cay et al.  (2022), who found that implementing a fingerprint attendance system significantly  reduced attendance fraud, as the system's reliance on physical identity characteristics  eliminated the loopholes exploited in manual systems. This finding is directly relevant to  Technocycle Corporation, which has reported recurring instances of "buddy punching"  through its manual logbooks. Beyond the disciplinary dimension, Levin (2024) analyzed  the financial consequences of such fraud—framing it as "wage theft"—and identified  manual tracking loopholes as a primary source of revenue leakage for service-based  companies. His analysis underscores that attendance fraud is not merely an HR issue
23

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
but a financial one, justifying the investment in a biometric-integrated HRIS to protect the  company's bottom line.
Geofencing technology extends this accountability further by anchoring  attendance records to verified physical locations. For a company like Technocycle,  where field technicians are deployed across multiple project sites, the ability to enforce  location-based clock-in and clock-out adds a layer of verification that biometrics alone  cannot provide. The integration of both biometric authentication and geofencing within a  unified HRIS therefore represents the most comprehensive solution for eliminating time  theft and ensuring data integrity across all branches and project sites.
Service Request Dynamics and Digital Ticketing Systems
Effective management of a technical workforce extends beyond attendance—it  encompasses the entire lifecycle of a service request. Ariningsih (2025) found that digital  ticketing systems promote organizational accountability by ensuring every task is logged  and tracked from initiation to completion, enabling managers to identify specific  bottlenecks in service execution. This global finding is echoed locally by Jaquilmo et al.  (2023), who developed a tracking system for the Department of Social Welfare and  Development in the Philippines and introduced the "aging of transactions" metric—a  measure of how long a request remains pending—as a critical performance indicator for  any technical service provider.
Automation plays a transformative role in optimizing service management.  Saadati (2024) found that systems capable of intelligently routing and prioritizing tickets  based on technician availability, urgency, or skill level significantly improved customer  satisfaction. Nevertheless, Jäntti (2025) and Ferdinand et al. (2025) caution that usability
24

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
and user experience remain the ultimate determinants of system success. Their  research indicates that even technically superior systems will fail to deliver value if the  interface is too complex to use, leading to inconsistent adoption and degraded service outcomes. This insight directly informs the design priorities of the TechnoSys HRIS,  which must serve both office administrators and field technicians with varying levels of  digital literacy.
Modernizing Inventory and Procurement Control
For a multi-service technical company, inventory management is inseparable  from service delivery. Rodriguez (2025) and Tanaman et al. (2023) both emphasize that  manual inventory systems are prone to human error, frequently resulting in stock-outs  that delay service repairs and damage client relationships. Web-based inventory  systems, in contrast, provide real-time updates on usage and stock levels.  Chukwumuanya et al. (2025) found this capability particularly beneficial for SMEs  managing shared inventory across multiple service departments, while Buitron (2025)  and Lee and Park (2024) demonstrated that automation reduces manual labor and  ensures materials are reliably available when a technician is dispatched to a job site.
Procurement processing is equally essential, as delays in purchasing materials  can halt technical operations entirely. Sutisna (2025) and Rouhani-Tazangi et al. (2025)  found that e-procurement systems improve policy adherence and organizational  transparency by fully digitizing the approval workflow. Locally, Raralio et al. (2025)  successfully implemented a document tracking system for purchase requests that  resolved recurring issues of misplaced paper records and slow manual processing. Ali  (2025) and Fernández et al. (2025) argue that the greatest operational gains are
25

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
achieved when procurement is integrated directly with inventory modules, creating a  seamless, automated loop where restocking is triggered by real-time usage data— eliminating the lag that manual procurement processes introduce.
Data Privacy, Security, and Inter-Branch Synchronization
The centralization of employee data within an HRIS introduces critical  responsibilities around data security and privacy compliance. In the Philippines, the Data  Privacy Act of 2012 (Republic Act No. 10173) mandates that personal data must be  collected for a legitimate purpose and secured against unauthorized access. Hemavathi  and Chakravarthi (2024) explained that modern systems must follow the principle of  "Privacy by Design," embedding security features such as Role-Based Access Control  (RBAC) and data encryption from the outset rather than as an afterthought. This ensures  that operational efficiency gains are not achieved at the expense of employee data  protection.
Inter-branch data synchronization presents an additional layer of complexity.  Ateeq et al. (2025) found that an integrated HRIS functions as a vital internal  communication hub, allowing management to disseminate policies and announcements  instantly to all employees regardless of location. This finding is particularly relevant to  Technocycle Corporation, which operates a main branch and three sister branches with  previously fragmented records. The implementation of a centralized HRIS with role based access ensures that each branch can manage its own data while contributing to a  unified organizational record that gives management a complete and accurate view of  the entire workforce.
26

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Software Quality Assurance: The ISO/IEC 25010 Framework
Regardless of its functional scope, any information system developed for  organizational use must be evaluated against a rigorous quality standard. The ISO/IEC  25010:2023 Software Quality Model provides this definitive framework. Rojas (2025) and  Sarwosri (2023) identify it as the gold standard for software evaluation because it  provides measurable indicators across eight key quality characteristics, including  functional suitability, usability, reliability, and performance efficiency. Carrión-León et al.  (2025) found that usability and reliability are the most decisive factors in user adoption,  while Müller et al. (2023) demonstrated that performance efficiency is the best predictor  of overall user satisfaction in a corporate environment.
By anchoring the evaluation of TechnoSys to the ISO/IEC 25010 framework, the  research moves beyond subjective user feedback to a professionally validated,  internationally recognized standard. This is especially significant for a system serving a  technical workforce in a high-demand service environment, where system downtime or  usability failures have direct operational and financial consequences. The framework  ensures that the HRIS is not merely functional but is a robust, reliable, and efficient  system capable of supporting Technocycle Corporation's complex and growing  operational demands.
In the Philippine context, Jenelle Malaluan (2025) assessed the automation of  Human Resource Management in selected medium enterprises in Quezon City using the  Technology Acceptance Model (TAM). The study found that HR automation significantly  improved operational efficiency by reducing manual errors and streamlining functions  such as attendance tracking and recruitment. However, the transition was not without  friction—employees encountered challenges related to system reliability and technical
27

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
difficulties during the adoption period. Technocycle Corporation, as a medium enterprise  in a similar operational landscape, is likely to face analogous challenges, making the  management of this transition a key concern for the successful deployment of its HRIS.
Local research on service management systems further supports the value of  digitization for Philippine organizations. Jaquilmo and Sarmiento (2023) demonstrated  that a web-based document tracking system significantly improved transaction  transparency and accountability within a government agency, while Raralio et al. (2025)  showed that digitizing purchase request workflows in a state college eliminated the  physical document loss and processing delays common in manual procurement  systems. These local findings validate the applicability of integrated digital systems to  the Philippine organizational context and reinforce the necessity of the solutions  proposed in both the TechnoSys and Technocycle HRIS studies.
Internationally, the evidence for HRIS effectiveness in service-oriented  organizations is consistent and compelling. Kumar et al. (2025) found a positive  relationship between HRIS adoption and employee productivity in Indian service  companies, attributing it to the system's capacity to enhance communication and reduce  administrative burden. Ateeq et al. (2025) expanded this view by demonstrating that  HRIS acts as a central communication hub, enabling management to instantly  disseminate information to all staff regardless of location—a finding directly applicable to  Technocycle's multi-branch structure.
Cay et al. (2022) provided direct empirical evidence for the effectiveness of  biometric attendance systems, finding that fingerprint authentication significantly reduced  attendance fraud by making it physically impossible for employees to log in on behalf of  others. This finding reinforces the biometric component of TechnoSys and addresses the
28

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
specific challenge of "buddy punching" identified at Technocycle Corporation. Vilma and  Booshnam (2025) complemented this by highlighting that organizational performance  improvements are mediated by the degree to which employees accept and adapt to new  digital systems, underscoring the importance of a user-centered design approach and  structured onboarding process.
Finally, Milhem et al. (2025) offered a macro-level perspective, finding that SMEs  in developing countries are most likely to successfully adopt cloud-based HRM systems  when driven by competitive environmental pressure and supported by adequate  technological readiness. This suggests that Technocycle's motivation to implement an  HRIS—stemming from the operational strains of a growing service company—is  precisely the kind of environmental pressure that predicts successful adoption and long term utilization of the system.
Synthesis of the Reviewed Literature and Studies
The body of literature reviewed across both conceptual and empirical dimensions  converges on a unified conclusion: the transition from fragmented, manual processes to  integrated, digital systems is no longer optional for service-oriented organizations  operating at scale. Both global researchers and local Philippine studies affirm that  centralized, web-based platforms eliminate information silos, enhance real-time  decision-making, and create the organizational transparency necessary for efficient  multi-branch operations. These principles apply equally to workforce management and  to service operations management, reinforcing the dual focus of the present research.
Specifically, the literature establishes that biometric authentication and  geofencing are the most reliable technologies for eliminating attendance fraud and
29

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
ensuring accountable time-tracking for mobile technical workforces—directly addressing  documented challenges at Technocycle Corporation. At the same time, the integration of  service ticketing, inventory management, and procurement into a unified platform is  validated as the most effective approach for eliminating the operational delays and data  discrepancies caused by standalone, disconnected systems.
A notable gap in existing literature is the scarcity of studies focusing on a  comprehensive, unified platform designed specifically for multi-service technical  organizations that must simultaneously manage workforce monitoring, field service  coordination, inventory consumption, and inter-branch synchronization. Most local  Philippine studies address these functions in isolation. The present research directly  addresses this gap by proposing an integrated HRIS—TechnoSys—that consolidates  these functions into a single, geofence-enabled, cross-platform system, validated  against the ISO/IEC 25010 Software Quality Model to ensure it meets international  standards for reliability, usability, and performance.
30

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Chapter 3
METHODOLOGY
Research Design
This study utilizes the Iterative Software Development Life Cycle (SDLC) model.  This cyclical approach is particularly suited for TechnoSys, as it allows for the  incremental refinement of complex integrations, specifically the Geofencing API and  Biometric Authentication based on continuous testing and stakeholder feedback from  Technocycle Corp.
Iterative SDLC Model
The development process follows a six-phase cycle. This approach  acknowledges that HRIS requirements for multi-service technical operations may evolve  as the system is piloted. Each iteration results in a functional build that brings the system  closer to the final integrated solution.
Figure 2. Iterative SDLC Model
31

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Iteration Process
In each iteration, the system will undergo the phases outlined in Section 3.2. The  output of one iteration will serve as the input for the next. The number of iterations will  depend on the complexity of the requirements and the feedback received from the end users at Technocycle Corp.
Explanation of the Iterative Phases
Planning
The researchers will define the scope for each iteration. The first iteration will  prioritize the "Critical Core": the PostgreSQL database schema and the primary  Geofenced Clock-in/out mechanism. Subsequent iterations will plan for more complex  modules like the Internal Ticketing System and cross-platform access, which will be  prioritized.
Analysis
User requirements will be gathered through interviews, surveys, and document  analysis. The researchers will identify the functional and non-functional requirements  necessary to address current issues in attendance management. This will include a  review of scholarly works to support the system's framework.
Design
The system architecture and database structure will be created to support the  dual-platform nature of the application. This phase will translate the collected  requirements into a technical blueprint, establishing the user interface wireframes,
32

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
database schemas, and process flows necessary for the development of the HRIS.
Implementation
The researchers will develop the system modules using modern full-stack  technologies such as PHP (Laravel), database of PostgreSQL and JavaScript  frameworks (Vue.js/Inertia.js). Each iteration will include the coding of core features,  focusing specifically on the integration of biometric authentication APIs and geofencing  technologies to establish secure connectivity between the mobile application and the  administrative backend.
Testing
The development team will conduct comprehensive functional, usability, and  performance testing on the developed modules. This phase ensures that technical  components—such as GPS accuracy and biometric latency—meet the specified  requirements and that the system works as intended before being presented to the  client. Any identified bugs will be systematically fixed.
Evaluation and Maintenance
After each iteration, the working prototype will be evaluated by the stakeholders  and target users. Their feedback regarding operational efficiency and user experience  will be systematically recorded and analyzed. These evaluations will be used to enhance  the system, triggering necessary improvements in the subsequent iteration cycle.
33

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Technical Requirements
Assistant Supervisor (Branch Operations)
User Story: I want to view the list of employees filtered strictly by their assigned branch  (e.g., Mother Branch vs. Sister Company).
Technical Side: Role-Based Access Control (RBAC) and Tenant Data Isolation.
User Story: I want to easily view the real-time working status and job titles (e.g.,  technician, supervisor) of my employees.
Technical Side: Real-Time Employee Directory and Status Dashboard.
User Story: I want to perform a VIP schedule override to immediately swap schedules  for urgent tasks.
Technical Side: Mutable Scheduling Engine with Transactional Overrides and Push  Notifications.
User Story: I want to broadcast announcements to the team.
Technical Side: Centralized Notification and Broadcasting Module.
User Story: I want to receive low-stock alerts so I can process procurement requests  before a technician needs the parts.
Technical Side: Automated Inventory Threshold Monitoring.
34

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
HR Administrator (Global Management)
User Story: I want global access to handle all workers across all company branches. Technical Side: Global Admin Bypass and Master Records Database.
User Story: I want to manage and update employee life-cycle statuses (active, on leave,  terminated, archived).
Technical Side: Employee Lifecycle Management (CRUD operations for account  states).
User Story: I want to edit the benefits and statutory deductions (Tax, SSS, PhilHealth,  Pag-IBIG) on employee salaries.
Technical Side: Configurable Payroll Deduction Matrix / Computation Engine.
Technician (End-user Access)
User Story: I want to receive and view my generated payslip on time. Technical Side: Automated Payslip Generation and Retrieval Module.
User Story: I want to submit a payslip appeal if there are miscomputations by the  accounting department.
Technical Side: Internal Ticketing and Dispute Management System. User Story: I want to easily access and download standard company forms (e.g., leave
35

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
or resignation forms) from the app.
Technical Side: Secure Document Management System (DMS) / File Repository. User Story: I want to see my deployment schedule and my required geolocational  assignment (e.g., Alabang or Cebu).
Technical Side: Individual Shift Scheduling Interface with Geofence Coordinate  Mapping.
User Story: I want to view the company calendar to track special holidays and anticipate  my 30% salary multipliers.
Technical Side: Interactive Company Calendar API linked to Payroll Multipliers.
User Story: I want to view my assigned service ticket and update its status to  'Completed' while on-site.
Technical Side: Mobile Service Ticketing Module.
36

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
REFERENCES
Ali, Q. (2025). Transforming organizational performance through e-procurement systems.  International Journal of Supply Chain Management, 14(1), 33–45.
Alshamrani, A., Mesfer, A., & Khan, M. A. (2023). Integrated web-based information  systems for service-oriented organizations. Journal of Information Systems  Engineering, 38(2), 145–158.
Ariningsih. (2025). Ticketing management system evaluation using ISO/IEC 25010.  Journal of Service Systems, 9(1), 22–35.
Ateeq, A., Alfiras, M., Alaghbari, M. A., & Almuraqab, N. A. S. (2025). The influence of  human resource information systems on employee performance within the Ministry  of Communications and Transportation in the Kingdom of Bahrain. Frontiers in  Communication, 10. https://doi.org/10.3389/fcomm.2025.1644487
Bangura, S. (2024). Human Resource Information System (HRIS): Navigating the  implementation, challenges, and benefits. International Journal of Business &  Management Studies, 5(10), 25–32. https://doi.org/10.56734/ijbms.v5n10a3
Buitron, T. (2025). Inventory management systems through integration of automation  technologies. International Journal of Information Systems and Operations, 12(3),  88–101.
Carrión-León, D. I., Gómez, J., & Herrera, L. (2025). Evaluating interaction capability  aligned with ISO/IEC 25010:2023. Computers, 14(9), 370.
37

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
https://doi.org/10.3390/computers14090370
Cay, S., Sartika, D., Sumiaty, R. Y., Meryati, A., & Sunarsi, D. (2022). The effect of  fingerprint attendance and work motivation on employee discipline on CV Story of  Copyright. http://ojs.unm.ac.id/jo
Chowdhury, Md. A. M., & Ahmed, R. (2025). The role of human resource information  systems (HRIS) in decision-making effectiveness and organizational efficiency:  Perceptual analysis on service sector employees. Journal of Research, Innovation  and Technologies, 4(3), 309–321. https://doi.org/10.56578/jorit040306
Chukwumuanya, O. E., Okeke, C., & Bello, A. (2025). Web-based inventory management  systems for small businesses. Journal of ICT Systems, 11(2), 55–69. Fernández, J. M., López, R., & Santos, P. (2025). Integrating procurement and inventory  systems for improved traceability and accountability. International Journal of  Supply Chain Management, 14(2), 77–90.
Ferdinand, Y., Lubis, M., & Pratiwi, O. N. (2025). Classification of helpdesk tickets using  support vector machines. Proceedings of the International Conference on  Information Technology, 102–108.
Grepon, B. G., Margallo, J., Maserin, J., & Dompol, R. A. (2023). RUI: A web-based road  updates information system using Google Maps API. International Journal of  Computing Sciences Research, 7, 2253–2271.  https://doi.org/10.25147/ijcsr.2017.001.1.158
Hemavathi, S., & Chakravarthi, R. (2024). AI-powered security and attendance  management system using deep learning and facial recognition. Journal of  Information Systems Engineering and Management, 2025(35s).  https://www.jisem-journal.com/
38

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
ISO/IEC. (2023). ISO/IEC 25010:2023 systems and software engineering—Systems and  software quality requirements and evaluation (SQuaRE)—Product quality model.  International Organization for Standardization.
Jaquilmo, C., & Sarmiento, J. (2023). Web-based electronic document tracking  management system. Global Scientific Journal, 11.  https://globalscientificjournal.com/researchpaper/WEB_BASED_ELECTRONIC_ DOCUMENT_TRACKING_MANAGEMENT_SYSTEM.pdf
Jäntti, M. (2025). Exploring customer self-service quality in IT service provision. Journal  of Systems and Software, 210, 111023.
Kumar, P., Tiwari, S., & Devka, K. (2025). Impact of Human Resource Information System  (HRIS) on employee productivity in service sector: SmartPLS based analysis.  Delhi Business Review, 25(2), 65–75.  https://doi.org/10.51768/dbr.v25i2.252202407
Kumar, R., & Bansal, S. (2023). Modular web-based enterprise systems for service oriented organizations. Journal of Enterprise Information Management, 36(4),  965–982. https://doi.org/10.1108/JEIM-02-2023-0061
Laudon, K. C., & Laudon, J. P. (2022). Management information systems: Managing the  digital firm (17th ed.). Pearson.
Lee, H., & Park, J. (2024). Automation-driven inventory and procurement systems in  service enterprises. Journal of Operations and Information Management, 11(1),  41–56.
Levin, B. (2024). Wage theft criminalization. https://scholar.law.colorado.edu/faculty articles
Malaluan, J. M. P. (2025). Assessment of automation in human resource management in
39

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
selected medium enterprises: Inputs for developing a human resource information  system. International Journal of Novel Research and Development, 10.  www.ijnrd.org
Milhem, M., Ayyash, M. M., Ateeq, A., Alzaghal, Q., Alzoraiki, M., Almuraqab, N. A. S., &  Almeer, S. (2025). An integrated adoption model of cloud computing-based human  resource management by SMEs in developing countries: Evidence from Bahrain.  Frontiers in Sustainability, 6. https://doi.org/10.3389/frsus.2025.1503423
Müller, T., Schmidt, A., & Weber, F. (2023). Evaluating usability and performance  efficiency of web-based enterprise systems using ISO/IEC 25010. Software  Quality Journal, 31(3), 987–1005. https://doi.org/10.1007/s11219-023-09614-7
Raralio et al. (2025). Development of document tracking and archiving system for  procurement management office's purchase request in Apayao State College.  International Journal of Research and Scientific Innovation.  https://rsisinternational.org
Rodriguez, V. H. P. (2025). Innovations in inventory management to improve MSME  sustainability. Sustainability, 17(4), 1892.
Rojas, H. (2025). Mapping the evolution and future directions of ISO/IEC 25010.  Engineering, Technology & Applied Science Research, 15(1), 10234–10241.  https://doi.org/10.48084/etasr.11772
Rouhani-Tazangi, M. R., Rahimi, A., & Karimi, S. (2025). E-procurement readiness  assessment in service organizations. Journal of Procurement and Supply  Management, 9(2), 64–78.
Saadati, H. (2024). Optimizing the ticket response process in customer support systems.  Service Management Review, 18(3), 201–214.
40

POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
Salvador, M. A., Botangen, K. A., Rabang, M. C., Salinas, I. C., Naagas, M., & Balagot, A.  (2024). Development of a web-based research consortium database management  system: Advancing data-driven and knowledge-based project management (pp.  87–92). https://doi.org/10.1145/3670105.3670120
Savitri, T. A., Buchori, I., & Supratikta, H. (2024). Exploring the role of human resources  information system in employee performance management: A systematic literature  review. Indonesian Development of Economics and Administration Journal, 3(1),  55–64. https://doi.org/10.70001/idea.v3i1.211
Singh, A., Kalra, A., Teotia, R., & Mamgain, S. (2024). Smart campus: Smart attendance  management system using face recognition. www.ijfmr.com
Sutisna. (2025). [E-procurement systems in service organizations]. [Journal details as per  original source].
Tanaman, T., Baylosis, J., Abiles, J., Catungal, M., & Encarnacio, P. (2023). Web-based  inventory management system. https://www.studocu.com/ph
Vilma, A., & Booshnam, D. (2025). Agility toward the HRIS advancement at the  organization and its impact on performance in SMEs. Journal of Small Business  Strategy, 35(3), 58–75. https://doi.org/10.53703/001c.142296
Yasir Hussein, R., & Ghorbel, A. (2024). Impact of human resources information systems  on job performance quality: A field study in health administration in Dhi Qar.  Webology, 21(1). http://www.webology.org
Zhang, Y., Chen, L., & Wang, X. (2024). Cloud-based service management platforms for  multi-service organizations. Future Internet, 16(2), 58.  https://doi.org/10.3390/fi16020058
41