// Sample databases. DreamHome values are the instance shown in the Relational Model lecture
// (dates converted to ISO format so they sort and compare correctly in SQLite).

export interface Dataset { id: string; name: string; desc: string; ddl: string }

const DREAMHOME = `
CREATE TABLE Branch (
  branchNo  VARCHAR(4)  PRIMARY KEY,
  street    VARCHAR(25) NOT NULL,
  city      VARCHAR(15) NOT NULL,
  postcode  VARCHAR(8)  NOT NULL UNIQUE
);
CREATE TABLE Staff (
  staffNo   VARCHAR(5)  PRIMARY KEY,
  fName     VARCHAR(15) NOT NULL,
  lName     VARCHAR(15) NOT NULL,
  position  VARCHAR(10) NOT NULL,
  sex       CHAR(1)     CHECK (sex IN ('M','F')),
  DOB       DATE,
  salary    DECIMAL(7,2) NOT NULL CHECK (salary > 0),
  branchNo  VARCHAR(4)  REFERENCES Branch(branchNo)
);
CREATE TABLE PrivateOwner (
  ownerNo   VARCHAR(5)  PRIMARY KEY,
  fName     VARCHAR(15) NOT NULL,
  lName     VARCHAR(15) NOT NULL,
  address   VARCHAR(50) NOT NULL,
  telNo     VARCHAR(13),
  eMail     VARCHAR(50)
);
CREATE TABLE PropertyForRent (
  propertyNo VARCHAR(5)  PRIMARY KEY,
  street     VARCHAR(25) NOT NULL,
  city       VARCHAR(15) NOT NULL,
  postcode   VARCHAR(8),
  type       VARCHAR(5)  NOT NULL CHECK (type IN ('House','Flat')),
  rooms      INTEGER     NOT NULL,
  rent       DECIMAL(6,2) NOT NULL,
  ownerNo    VARCHAR(5)  NOT NULL REFERENCES PrivateOwner(ownerNo),
  staffNo    VARCHAR(5)  REFERENCES Staff(staffNo),
  branchNo   VARCHAR(4)  NOT NULL REFERENCES Branch(branchNo)
);
CREATE TABLE Client (
  clientNo  VARCHAR(5)  PRIMARY KEY,
  fName     VARCHAR(15) NOT NULL,
  lName     VARCHAR(15) NOT NULL,
  telNo     VARCHAR(13),
  prefType  VARCHAR(5),
  maxRent   DECIMAL(6,2),
  eMail     VARCHAR(50)
);
CREATE TABLE Viewing (
  clientNo   VARCHAR(5) NOT NULL REFERENCES Client(clientNo),
  propertyNo VARCHAR(5) NOT NULL REFERENCES PropertyForRent(propertyNo),
  viewDate   DATE NOT NULL,
  comment    VARCHAR(50),
  PRIMARY KEY (clientNo, propertyNo)
);
CREATE TABLE Registration (
  clientNo   VARCHAR(5) PRIMARY KEY REFERENCES Client(clientNo),
  branchNo   VARCHAR(4) NOT NULL REFERENCES Branch(branchNo),
  staffNo    VARCHAR(5) NOT NULL REFERENCES Staff(staffNo),
  dateJoined DATE NOT NULL
);
INSERT INTO Branch VALUES
 ('B005','22 Deer Rd','London','SW1 4EH'),
 ('B007','16 Argyll St','Aberdeen','AB2 3SU'),
 ('B003','163 Main St','Glasgow','G11 9QX'),
 ('B004','32 Manse Rd','Bristol','BS99 1NZ'),
 ('B002','56 Clover Dr','London','NW10 6EU');
INSERT INTO Staff VALUES
 ('SL21','John','White','Manager','M','1945-10-01',30000,'B005'),
 ('SG37','Ann','Beech','Assistant','F','1960-11-10',12000,'B003'),
 ('SG14','David','Ford','Supervisor','M','1958-03-24',18000,'B003'),
 ('SA9','Mary','Howe','Assistant','F','1970-02-19',9000,'B007'),
 ('SG5','Susan','Brand','Manager','F','1940-06-03',24000,'B003'),
 ('SL41','Julie','Lee','Assistant','F','1965-06-13',9000,'B005');
INSERT INTO PrivateOwner VALUES
 ('CO46','Joe','Keogh','2 Fergus Dr, Aberdeen AB2 7SX','01224-861212','jkeogh@lhh.com'),
 ('CO87','Carol','Farrel','6 Achray St, Glasgow G32 9DX','0141-357-7419','cfarrel@gmail.com'),
 ('CO40','Tina','Murphy','63 Well St, Glasgow G42','0141-943-1728','tinam@hotmail.com'),
 ('CO93','Tony','Shaw','12 Park Pl, Glasgow G4 0QR','0141-225-7025','tony.shaw@ark.com');
INSERT INTO PropertyForRent VALUES
 ('PA14','16 Holhead','Aberdeen','AB7 5SU','House',6,650,'CO46','SA9','B007'),
 ('PL94','6 Argyll St','London','NW2','Flat',4,400,'CO87','SL41','B005'),
 ('PG4','6 Lawrence St','Glasgow','G11 9QX','Flat',3,350,'CO40',NULL,'B003'),
 ('PG36','2 Manor Rd','Glasgow','G32 4QX','Flat',3,375,'CO93','SG37','B003'),
 ('PG21','18 Dale Rd','Glasgow','G12','House',5,600,'CO87','SG37','B003'),
 ('PG16','5 Novar Dr','Glasgow','G12 9AX','Flat',4,450,'CO93','SG14','B003');
INSERT INTO Client VALUES
 ('CR76','John','Kay','0207-774-5632','Flat',425,'john.kay@gmail.com'),
 ('CR56','Aline','Stewart','0141-848-1825','Flat',350,'astewart@hotmail.com'),
 ('CR74','Mike','Ritchie','01475-392178','House',750,'mritchie01@yahoo.co.uk'),
 ('CR62','Mary','Tregear','01224-196720','Flat',600,'maryt@hotmail.co.uk');
INSERT INTO Viewing VALUES
 ('CR56','PA14','2013-05-24','too small'),
 ('CR76','PG4','2013-04-20','too remote'),
 ('CR56','PG4','2013-05-26',NULL),
 ('CR62','PA14','2013-05-14','no dining room'),
 ('CR56','PG36','2013-04-28',NULL);
INSERT INTO Registration VALUES
 ('CR76','B005','SL41','2013-01-02'),
 ('CR56','B003','SG37','2012-04-11'),
 ('CR74','B003','SG37','2011-11-16'),
 ('CR62','B007','SA9','2012-03-07');
`

// The Student / Sport / Participation schema produced by normalizing the sports-club flat file
// (FD & Normalization lecture), plus the original repeating-group file for comparison.
const SPORTS = `
CREATE TABLE StudentSportsFlat (
  studentId INTEGER PRIMARY KEY, studentName VARCHAR(30),
  sport1 VARCHAR(20), price1 DECIMAL(6,2), sport2 VARCHAR(20), price2 DECIMAL(6,2)
);
INSERT INTO StudentSportsFlat VALUES
 (100,'Ann','Football',200,'Swimming',50),
 (150,'Bill','Tennis',150,NULL,NULL),
 (175,'Cara','Swimming',50,'Tennis',150),
 (200,'Dev','Football',200,NULL,NULL);
CREATE TABLE Student (studentId INTEGER PRIMARY KEY, studentName VARCHAR(30) NOT NULL);
CREATE TABLE Sport (sport VARCHAR(20) PRIMARY KEY, price DECIMAL(6,2) NOT NULL);
CREATE TABLE Participation (
  studentId INTEGER NOT NULL REFERENCES Student(studentId),
  sport VARCHAR(20) NOT NULL REFERENCES Sport(sport),
  PRIMARY KEY (studentId, sport)
);
INSERT INTO Student VALUES (100,'Ann'),(150,'Bill'),(175,'Cara'),(200,'Dev');
INSERT INTO Sport VALUES ('Football',200),('Swimming',50),('Tennis',150),('Golf',300);
INSERT INTO Participation VALUES (100,'Football'),(100,'Swimming'),(150,'Tennis'),(175,'Swimming'),(175,'Tennis'),(200,'Football');
`

// Classic Oracle-style EMP/DEPT teaching schema used for SELECT, functions, joins,
// aggregation, views and subqueries practice (lab-style exercises).
const COMPANY = `
CREATE TABLE dept (
  deptno INTEGER PRIMARY KEY,
  dname  VARCHAR(14) NOT NULL,
  loc    VARCHAR(13)
);
CREATE TABLE emp (
  empno    INTEGER PRIMARY KEY,
  ename    VARCHAR(10) NOT NULL,
  job      VARCHAR(9),
  mgr      INTEGER REFERENCES emp(empno),
  hiredate DATE,
  sal      DECIMAL(7,2),
  comm     DECIMAL(7,2),
  deptno   INTEGER REFERENCES dept(deptno)
);
CREATE TABLE salgrade (grade INTEGER PRIMARY KEY, losal DECIMAL(7,2), hisal DECIMAL(7,2));
INSERT INTO dept VALUES (10,'ACCOUNTING','NEW YORK'),(20,'RESEARCH','DALLAS'),(30,'SALES','CHICAGO'),(40,'OPERATIONS','BOSTON');
INSERT INTO emp VALUES
 (7839,'KING','PRESIDENT',NULL,'1981-11-17',5000,NULL,10),
 (7698,'BLAKE','MANAGER',7839,'1981-05-01',2850,NULL,30),
 (7782,'CLARK','MANAGER',7839,'1981-06-09',2450,NULL,10),
 (7566,'JONES','MANAGER',7839,'1981-04-02',2975,NULL,20),
 (7788,'SCOTT','ANALYST',7566,'1987-04-19',3000,NULL,20),
 (7902,'FORD','ANALYST',7566,'1981-12-03',3000,NULL,20),
 (7369,'SMITH','CLERK',7902,'1980-12-17',800,NULL,20),
 (7499,'ALLEN','SALESMAN',7698,'1981-02-20',1600,300,30),
 (7521,'WARD','SALESMAN',7698,'1981-02-22',1250,500,30),
 (7654,'MARTIN','SALESMAN',7698,'1981-09-28',1250,1400,30),
 (7844,'TURNER','SALESMAN',7698,'1981-09-08',1500,0,30),
 (7876,'ADAMS','CLERK',7788,'1987-05-23',1100,NULL,20),
 (7900,'JAMES','CLERK',7698,'1981-12-03',950,NULL,30),
 (7934,'MILLER','CLERK',7782,'1982-01-23',1300,NULL,10);
INSERT INTO salgrade VALUES (1,700,1200),(2,1201,1400),(3,1401,2000),(4,2001,3000),(5,3001,9999);
`

// Vendor/Product from the SQL and Oracle Database lecture (inventory values from the SQL lecture;
// reorder columns from the Triggers and Stored Procedures lecture).
const VENDOR = `
CREATE TABLE Vendor (
  V_Code    INTEGER PRIMARY KEY,
  V_Name    VARCHAR(25) NOT NULL,
  V_Address VARCHAR(80) NOT NULL,
  V_Phone   CHAR(8)
);
CREATE TABLE Product (
  P_Code       VARCHAR(8) PRIMARY KEY,
  P_Descript   VARCHAR(35) NOT NULL,
  P_Indate     DATE NOT NULL DEFAULT (date('now')),
  P_Onhand     INTEGER NOT NULL,
  P_Min        INTEGER DEFAULT 0,
  P_Price      DECIMAL(8,2) NOT NULL,
  V_Code       INTEGER REFERENCES Vendor(V_Code),
  P_Reorder    INTEGER DEFAULT 0,
  P_ReorderQty INTEGER DEFAULT 0
);
INSERT INTO Vendor VALUES
 (14021,'1st Computers','5 Henry St, Port of Spain, Trinidad','628-4598'),
 (3061,'Advantage Computer Ltd.','12 Ninth Ave., Barataria, Trinidad','674-5449'),
 (4516,'NewTech','18 Bush St., Arima, Trinidad','667-2156'),
 (4068,'Data Ltd.','5 Clair Ave., Port of Spain, Trinidad','628-3456');
INSERT INTO Product VALUES
 ('COM6','T-660 Notebook','2006-12-19',4,3,8000.00,3061,0,5),
 ('COM8','T-800 Notebook','2006-01-10',8,3,10000.00,3061,0,5),
 ('PRI/XL2','XL2-Printer','2006-11-27',14,10,2000.00,14021,0,15),
 ('PRI/XG','XG-Printer','2006-11-27',10,10,1599.00,14021,1,15),
 ('CDR-R','Rocket CD Recorder','2006-12-12',4,2,2999.00,4516,0,5),
 ('2348','Surge Protect','2006-01-15',35,20,199.00,14021,0,25),
 ('2450-6','Scan Master 6.1','2006-10-10',5,5,1500.00,3061,1,5),
 ('NET-100','Net Kit -100','2006-11-25',25,15,650.00,4068,0,20);
`

export const DATASETS: Dataset[] = [
  { id: 'dreamhome', name: 'DreamHome', desc: 'Property rental case study from the Relational Model lecture: Branch, Staff, PropertyForRent, Client, PrivateOwner, Viewing, Registration.', ddl: DREAMHOME },
  { id: 'vendor', name: 'Vendor/Product', desc: 'The SQL lecture’s Vendor and Product tables (8 products, 4 vendors), with the reorder columns used in the triggers lecture.', ddl: VENDOR },
  { id: 'company', name: 'Company (EMP/DEPT)', desc: 'The classic Oracle teaching schema: emp, dept, salgrade. Used for lab-style SELECT, function, join, aggregation, view and subquery drills.', ddl: COMPANY },
  { id: 'sports', name: 'Sports club', desc: 'The normalization lecture’s flat file (StudentSportsFlat with SPORT_1/PRICE_1…) and its 3NF decomposition: Student, Sport, Participation.', ddl: SPORTS },
  { id: 'empty', name: 'Empty database', desc: 'A blank database for your own CREATE TABLE experiments.', ddl: '' },
]
