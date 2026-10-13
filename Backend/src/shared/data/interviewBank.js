const questionsBank = {
  'JavaScript': [
    { question: 'Explain the concept of closures in JavaScript and provide a practical use case.', category: 'fundamentals' },
    { question: 'How does the event loop work in JavaScript?', category: 'fundamentals' },
    { question: 'What is the difference between var, let, and const?', category: 'fundamentals' },
    { question: 'Explain prototypal inheritance in JavaScript.', category: 'fundamentals' },
    { question: 'How do you handle asynchronous operations in JavaScript?', category: 'practical use' },
    { question: 'What are Promises and how do they compare to callbacks?', category: 'practical use' },
    { question: 'Explain the "this" keyword in JavaScript and how its value is determined.', category: 'fundamentals' },
    { question: 'How do you debug memory leaks in a JavaScript application?', category: 'debugging' },
    { question: 'What are the trade-offs of using Server-Side Rendering (SSR) vs Client-Side Rendering (CSR)?', category: 'trade-offs' },
    { question: 'Write a function to deep clone a JavaScript object.', category: 'coding' },
    { question: 'How do you optimize the performance of a JavaScript application?', category: 'practical use' },
    { question: 'Explain the difference between == and === in JavaScript.', category: 'fundamentals' }
  ],
  'Python': [
    { question: 'Explain the difference between list comprehensions and generator expressions in Python.', category: 'fundamentals' },
    { question: 'How does memory management and garbage collection work in Python?', category: 'fundamentals' },
    { question: 'What are decorators in Python and how do you create one?', category: 'practical use' },
    { question: 'Explain the Global Interpreter Lock (GIL) and its impact on multithreading.', category: 'fundamentals' },
    { question: 'How do you handle exceptions in Python?', category: 'practical use' },
    { question: 'What is the difference between a tuple and a list in Python?', category: 'fundamentals' },
    { question: 'Explain the concept of duck typing in Python.', category: 'fundamentals' },
    { question: 'How do you profile a Python application to find performance bottlenecks?', category: 'debugging' },
    { question: 'What are the trade-offs of using Python for backend development compared to Node.js?', category: 'trade-offs' },
    { question: 'Write a Python function to reverse a string without using built-in methods.', category: 'coding' },
    { question: 'Explain the use of the "yield" keyword in Python.', category: 'fundamentals' },
    { question: 'How do you manage dependencies in a Python project?', category: 'practical use' }
  ],
  'React': [
    { question: 'Explain the virtual DOM and how React uses it to optimize rendering.', category: 'fundamentals' },
    { question: 'What is the difference between functional components and class components?', category: 'fundamentals' },
    { question: 'Explain the component lifecycle in React.', category: 'fundamentals' },
    { question: 'How do you manage state in a complex React application?', category: 'practical use' },
    { question: 'What are React Hooks and what rules must you follow when using them?', category: 'practical use' },
    { question: 'Explain the use of useEffect and how to prevent infinite loops.', category: 'debugging' },
    { question: 'How do you handle form validation in React?', category: 'practical use' },
    { question: 'What are the trade-offs between using Context API vs Redux for state management?', category: 'trade-offs' },
    { question: 'How do you optimize performance in a React application?', category: 'practical use' },
    { question: 'Write a React component that fetches data from an API and displays a list.', category: 'coding' },
    { question: 'Explain the concept of higher-order components (HOCs).', category: 'fundamentals' },
    { question: 'How do you handle routing in a React application?', category: 'practical use' }
  ],
  'Node.js': [
    { question: 'Explain the event-driven architecture of Node.js.', category: 'fundamentals' },
    { question: 'What is the difference between process.nextTick() and setImmediate()?', category: 'fundamentals' },
    { question: 'How do you handle streams in Node.js?', category: 'practical use' },
    { question: 'Explain the role of the package.json file.', category: 'fundamentals' },
    { question: 'How do you handle file uploads in Node.js?', category: 'practical use' },
    { question: 'What are the common security vulnerabilities in Node.js applications and how do you prevent them?', category: 'debugging' },
    { question: 'How do you scale a Node.js application to handle high traffic?', category: 'practical use' },
    { question: 'What are the trade-offs of using a monolithic architecture vs microservices with Node.js?', category: 'trade-offs' },
    { question: 'How do you debug a memory leak in a Node.js application?', category: 'debugging' },
    { question: 'Write a simple Express.js middleware function.', category: 'coding' },
    { question: 'Explain the use of the cluster module in Node.js.', category: 'fundamentals' },
    { question: 'How do you handle environment variables in Node.js?', category: 'practical use' }
  ],
  'SQL': [
    { question: 'Explain the difference between INNER JOIN and LEFT JOIN.', category: 'fundamentals' },
    { question: 'What are indexes in SQL and how do they improve query performance?', category: 'fundamentals' },
    { question: 'Explain the concept of normalization and its different normal forms.', category: 'fundamentals' },
    { question: 'How do you write a query to find the second highest salary in an employee table?', category: 'coding' },
    { question: 'What is a database transaction and what are the ACID properties?', category: 'fundamentals' },
    { question: 'How do you optimize a slow-running SQL query?', category: 'debugging' },
    { question: 'Explain the difference between a clustered and non-clustered index.', category: 'fundamentals' },
    { question: 'What are the trade-offs between using SQL vs NoSQL databases?', category: 'trade-offs' },
    { question: 'How do you handle deadlocks in a relational database?', category: 'debugging' },
    { question: 'Write a SQL query to calculate the moving average of sales.', category: 'coding' },
    { question: 'Explain the use of window functions in SQL.', category: 'fundamentals' },
    { question: 'How do you prevent SQL injection attacks?', category: 'practical use' }
  ],
  'MongoDB': [
    { question: 'Explain the difference between MongoDB and traditional relational databases.', category: 'fundamentals' },
    { question: 'What is a document in MongoDB and how is it structured?', category: 'fundamentals' },
    { question: 'How do you design a schema for a one-to-many relationship in MongoDB?', category: 'practical use' },
    { question: 'Explain the concept of sharding in MongoDB.', category: 'fundamentals' },
    { question: 'How do you create an index in MongoDB to improve query performance?', category: 'practical use' },
    { question: 'What is the Aggregation Framework in MongoDB and how is it used?', category: 'practical use' },
    { question: 'How do you handle transactions in MongoDB?', category: 'fundamentals' },
    { question: 'What are the trade-offs of embedding documents vs referencing them?', category: 'trade-offs' },
    { question: 'How do you backup and restore a MongoDB database?', category: 'practical use' },
    { question: 'Write a MongoDB query to find all users with a specific role.', category: 'coding' },
    { question: 'Explain the concept of replication in MongoDB.', category: 'fundamentals' },
    { question: 'How do you secure a MongoDB instance?', category: 'practical use' }
  ],
  'Java': [
    { question: 'Explain the concept of Object-Oriented Programming (OOP) in Java.', category: 'fundamentals' },
    { question: 'What is the difference between an interface and an abstract class in Java?', category: 'fundamentals' },
    { question: 'Explain the concept of multithreading in Java and how to create a thread.', category: 'practical use' },
    { question: 'How does garbage collection work in Java?', category: 'fundamentals' },
    { question: 'What are the different types of memory areas allocated by the JVM?', category: 'fundamentals' },
    { question: 'How do you handle exceptions in Java?', category: 'practical use' },
    { question: 'Explain the concept of generics in Java.', category: 'fundamentals' },
    { question: 'How do you profile a Java application to find performance bottlenecks?', category: 'debugging' },
    { question: 'What are the trade-offs of using Spring Boot vs plain Java EE?', category: 'trade-offs' },
    { question: 'Write a Java method to check if a string is a palindrome.', category: 'coding' },
    { question: 'Explain the use of the synchronized keyword in Java.', category: 'fundamentals' },
    { question: 'How do you manage dependencies in a Java project using Maven or Gradle?', category: 'practical use' }
  ],
  'Data Structures & Algorithms': [
    { question: 'Explain the difference between an array and a linked list.', category: 'fundamentals' },
    { question: 'How do you implement a stack using two queues?', category: 'coding' },
    { question: 'What is a binary search tree (BST) and how do you traverse it?', category: 'fundamentals' },
    { question: 'Explain the time complexity of quicksort and mergesort.', category: 'fundamentals' },
    { question: 'How do you find the shortest path in an unweighted graph?', category: 'practical use' },
    { question: 'What is dynamic programming and when should you use it?', category: 'practical use' },
    { question: 'Explain the concept of a hash table and how it handles collisions.', category: 'fundamentals' },
    { question: 'How do you optimize an algorithm with O(n^2) time complexity?', category: 'debugging' },
    { question: 'What are the trade-offs between using a hash map vs a binary search tree for lookups?', category: 'trade-offs' },
    { question: 'Write an algorithm to detect a cycle in a linked list.', category: 'coding' },
    { question: 'Explain the concept of a trie and its use cases.', category: 'fundamentals' },
    { question: 'How do you implement a priority queue?', category: 'coding' }
  ],
  'System Design': [
    { question: 'How would you design a URL shortening service like bit.ly?', category: 'practical use' },
    { question: 'Explain the difference between horizontal and vertical scaling.', category: 'fundamentals' },
    { question: 'What is a load balancer and how does it work?', category: 'fundamentals' },
    { question: 'How do you ensure data consistency in a distributed system?', category: 'fundamentals' },
    { question: 'Explain the concept of caching and its different strategies.', category: 'practical use' },
    { question: 'How do you handle rate limiting in an API?', category: 'practical use' },
    { question: 'What is a message queue and when should you use one?', category: 'fundamentals' },
    { question: 'How do you design a system to handle a sudden spike in traffic?', category: 'debugging' },
    { question: 'What are the trade-offs between a monolithic architecture and microservices?', category: 'trade-offs' },
    { question: 'Design a simple chat application system architecture.', category: 'coding' },
    { question: 'Explain the CAP theorem and its implications on system design.', category: 'fundamentals' },
    { question: 'How do you ensure high availability and disaster recovery in your system?', category: 'practical use' }
  ],
  'TypeScript': [
    { question: 'Explain the benefits of using TypeScript over JavaScript.', category: 'fundamentals' },
    { question: 'How do you handle type definitions in TypeScript?', category: 'practical use' },
    { question: 'What are generics in TypeScript and when would you use them?', category: 'practical use' },
    { question: 'Explain the concept of interfaces in TypeScript.', category: 'fundamentals' },
    { question: 'How do you handle type checking in TypeScript?', category: 'fundamentals' },
    { question: 'What is the difference between an interface and a type alias in TypeScript?', category: 'fundamentals' },
    { question: 'Explain the use of utility types like Partial, Pick, and Omit.', category: 'practical use' },
    { question: 'How do you debug TypeScript code in a Node.js environment?', category: 'debugging' },
    { question: 'What are the trade-offs of migrating a large JavaScript codebase to TypeScript?', category: 'trade-offs' },
    { question: 'Write a generic function to merge two objects in TypeScript.', category: 'coding' },
    { question: 'Explain the concept of union and intersection types.', category: 'fundamentals' },
    { question: 'How do you configure strict mode in the tsconfig.json file?', category: 'practical use' }
  ],

  // ==========================================
  // CIVIL ENGINEERING QUESTION BANKS
  // ==========================================
  'Civil': [
    { question: 'Explain the primary differences between working stress method (WSM) and limit state method (LSM) in RCC design.', category: 'fundamentals' },
    { question: 'What is the significance of the water-cement ratio in determining the compressive strength and durability of concrete?', category: 'fundamentals' },
    { question: 'How do you calculate the safe bearing capacity of soil from standard penetration test (SPT) N-values?', category: 'practical use' },
    { question: 'Explain the causes and prevention techniques for honeycombing and segregation in fresh concrete.', category: 'debugging' },
    { question: 'What are the critical factors considered in the geometric design of a highway pavement (camber, superelevation, and sight distance)?', category: 'trade-offs' }
  ],
  'Structural Engineering': [
    { question: 'Explain the concepts of bending moment and shear force diagrams for a simply supported beam carrying a uniformly distributed load (UDL).', category: 'fundamentals' },
    { question: 'What is the difference between determinate and indeterminate structures? Give examples of each.', category: 'fundamentals' },
    { question: 'Explain the assumptions of Euler’s column theory and the concept of slenderness ratio.', category: 'fundamentals' },
    { question: 'How do you perform moment distribution method for continuous beams?', category: 'practical use' },
    { question: 'Explain the importance of ductile detailing in earthquake-resistant design according to IS 13920.', category: 'practical use' }
  ],
  'Beams': [
    { question: 'Explain the bending equation M/I = sigma/y = E/R and state all its underlying assumptions.', category: 'fundamentals' },
    { question: 'Draw and explain the shear force and bending moment diagrams for a cantilever beam with a point load at the free end.', category: 'fundamentals' },
    { question: 'How do you determine the depth of the neutral axis in a singly reinforced rectangular concrete beam section?', category: 'practical use' },
    { question: 'What is deflection in beams and what are the standard methods used to calculate beam deflection (e.g., Macaulay’s method, moment-area method)?', category: 'practical use' },
    { question: 'What are flitched beams and when are they used in structural engineering?', category: 'trade-offs' },
    { question: 'How do you diagnose and rectify diagonal tension cracking near the supports of an RCC beam?', category: 'debugging' }
  ],
  'Columns': [
    { question: 'Explain Euler’s buckling load formula for columns and how effective length varies with end support conditions.', category: 'fundamentals' },
    { question: 'What is the difference between short columns (crushing failure) and long columns (buckling failure)?', category: 'fundamentals' },
    { question: 'Why are lateral ties or helical reinforcement provided in RCC columns, and what are their pitch and diameter specifications?', category: 'practical use' },
    { question: 'What is Rankine-Gordon formula and why is it preferred for intermediate columns?', category: 'fundamentals' },
    { question: 'How do you calculate the uniaxial and biaxial eccentricity in column loading?', category: 'practical use' }
  ],
  'Trusses': [
    { question: 'What is the condition for a plane truss to be statically determinate and rigid (m = 2j - 3)?', category: 'fundamentals' },
    { question: 'Explain the method of joints and method of sections for truss analysis. When is each method preferred?', category: 'practical use' },
    { question: 'What are zero-force members in a truss and how do you quickly identify them by inspection?', category: 'fundamentals' },
    { question: 'Explain the difference between a Pratt truss, Howe truss, and Warren truss with their ideal load-bearing applications.', category: 'trade-offs' },
    { question: 'How do secondary stresses develop in roof trusses and how are they minimized?', category: 'debugging' }
  ],
  'Frames': [
    { question: 'Explain the difference between sway and non-sway portal frames.', category: 'fundamentals' },
    { question: 'How is the portal method or cantilever method used for approximate lateral load analysis in multi-story frames?', category: 'practical use' },
    { question: 'What is the difference between rigid-jointed and pin-jointed frames in terms of degrees of freedom?', category: 'fundamentals' },
    { question: 'Explain the concept of plastic hinges and collapse mechanism in rigid frames.', category: 'trade-offs' }
  ],
  'Geotechnical Engineering': [
    { question: 'Explain the three-phase system of soil and define void ratio, porosity, and degree of saturation.', category: 'fundamentals' },
    { question: 'Explain Darcy’s law of permeability in soils and factors affecting permeability.', category: 'fundamentals' },
    { question: 'What is the difference between compaction and consolidation of soils in terms of mechanism and duration?', category: 'fundamentals' },
    { question: 'Explain Terzaghi’s one-dimensional consolidation theory and primary vs secondary consolidation.', category: 'practical use' }
  ],
  'Soil Mechanics': [
    { question: 'Explain the Atterberg limits (liquid limit, plastic limit, and shrinkage limit) and the plasticity index (PI).', category: 'fundamentals' },
    { question: 'What is the Mohr-Coulomb failure criterion for soil shear strength (tau = c + sigma * tan(phi))?', category: 'fundamentals' },
    { question: 'Explain the direct shear test vs triaxial shear test for determining soil shear parameters.', category: 'practical use' },
    { question: 'How do you perform Standard Proctor Test and what is Optimum Moisture Content (OMC)?', category: 'practical use' },
    { question: 'What causes quicksand condition in cohesionless soils and how is the critical hydraulic gradient calculated?', category: 'debugging' }
  ],
  'Foundations': [
    { question: 'Explain the differences between shallow foundations (isolated, combined, raft) and deep foundations (pile, well).', category: 'fundamentals' },
    { question: 'Explain Terzaghi’s bearing capacity equation for shallow strip footings and its bearing capacity factors (Nc, Nq, Ngamma).', category: 'fundamentals' },
    { question: 'What is negative skin friction in pile foundations, how does it occur, and how is it accounted for in design?', category: 'debugging' },
    { question: 'How do you check for differential settlement in building foundations and what are acceptable tolerance limits?', category: 'practical use' },
    { question: 'When is a mat/raft foundation selected over isolated footings?', category: 'trade-offs' }
  ],
  'Retaining Walls': [
    { question: 'Explain Rankine’s and Coulomb’s earth pressure theories and differentiate between active, passive, and at-rest earth pressure.', category: 'fundamentals' },
    { question: 'What are the stability checks required for a gravity or cantilever retaining wall (overturning, sliding, and bearing failure)?', category: 'practical use' },
    { question: 'Why are weep holes and backfill drainage filters provided in retaining walls?', category: 'debugging' },
    { question: 'Explain the difference between a cantilever retaining wall and a counterfort retaining wall.', category: 'trade-offs' }
  ],
  'Earthquake Engg.': [
    { question: 'Explain the seismic zoning of India as per IS 1893 and how the zone factor (Z) is selected.', category: 'fundamentals' },
    { question: 'How is the design base shear (Vb) calculated using the equivalent static lateral force method?', category: 'practical use' },
    { question: 'What is soil liquefaction during earthquakes, which soils are most vulnerable, and how can it be mitigated?', category: 'debugging' },
    { question: 'Explain the importance of the Response Reduction Factor (R) and Importance Factor (I) in seismic structural design.', category: 'fundamentals' }
  ],
  'Transportation': [
    { question: 'Explain the structural components of a flexible pavement (subgrade, sub-base, base, surface course) and their roles.', category: 'fundamentals' },
    { question: 'Compare flexible pavements (bituminous) vs rigid pavements (concrete) in terms of load transfer mechanism, life cycle cost, and maintenance.', category: 'trade-offs' },
    { question: 'How do you calculate Stopping Sight Distance (SSD) and Overtaking Sight Distance (OSD) on highways?', category: 'practical use' },
    { question: 'Explain the concept and calculation of superelevation on horizontal curves as per IRC standards.', category: 'practical use' }
  ],
  'Roads': [
    { question: 'What is the California Bearing Ratio (CBR) test and how is it used in pavement thickness design?', category: 'practical use' },
    { question: 'Explain the causes and remedial measures for pavement distresses such as rutting, alligator cracking, and potholes.', category: 'debugging' },
    { question: 'What is camber (cross slope) on roads, why is it provided, and how does its value vary with pavement type and rainfall?', category: 'fundamentals' },
    { question: 'Explain the difference between prime coat, tack coat, and seal coat in asphalt road construction.', category: 'fundamentals' }
  ],
  'Railways': [
    { question: 'What are railway gauges and what are the standard dimensions of Broad Gauge (BG), Metre Gauge (MG), and Narrow Gauge (NG)?', category: 'fundamentals' },
    { question: 'What is the function of railway ballast and what are the requirements of good ballast material?', category: 'fundamentals' },
    { question: 'Explain the phenomenon of creep of rails, its causes, and how creep anchors prevent it.', category: 'debugging' },
    { question: 'Explain cant (superelevation) and cant deficiency in railway track curves.', category: 'practical use' }
  ],
  'Traffic Engg.': [
    { question: 'Define traffic volume, traffic density, and traffic speed, and explain Greenshields macroscopic speed-density model.', category: 'fundamentals' },
    { question: 'What is Passenger Car Unit (PCU) and why is it used in traffic capacity analysis?', category: 'fundamentals' },
    { question: 'Explain Webster’s method for optimum signal cycle time calculation at road intersections.', category: 'practical use' },
    { question: 'What are the design requirements and traffic flow advantages of a modern roundabout (traffic rotary)?', category: 'trade-offs' }
  ],
  'Airports': [
    { question: 'Explain the wind rose diagram (Type 1 and Type 2) and how it determines runway orientation and runway wind coverage.', category: 'fundamentals' },
    { question: 'What are the basic runway length corrections applied for elevation, temperature, and effective gradient according to ICAO?', category: 'practical use' },
    { question: 'What is the purpose of holding aprons, taxiways, and terminal gates in airport airside design?', category: 'fundamentals' }
  ],
  'Surveying': [
    { question: 'State and explain the fundamental principles of surveying (working from whole to part, locating a point with respect to reference points).', category: 'fundamentals' },
    { question: 'Explain the difference between plane surveying and geodetic surveying.', category: 'fundamentals' },
    { question: 'What are the differences between Height of Instrument (HI) method and Rise & Fall method in levelling?', category: 'trade-offs' },
    { question: 'What is a Total Station, what measurements does it combine, and how does it store field coordinates?', category: 'practical use' }
  ],
  'Chain Survey': [
    { question: 'What are the different types of chains used in surveying (Metric, Gunter’s, Engineer’s, Revenue) and their lengths?', category: 'fundamentals' },
    { question: 'Explain the corrections applied to measured lengths in chaining (temperature, pull, sag, slope).', category: 'practical use' },
    { question: 'What are obstacles to chaining and how do you measure across a river or building?', category: 'practical use' },
    { question: 'What is the difference between cumulative errors and compensating errors in chain surveying?', category: 'fundamentals' }
  ],
  'Levelling': [
    { question: 'Define Bench Mark (BM), Back Sight (BS), Fore Sight (FS), and Change Point (CP) in differential levelling.', category: 'fundamentals' },
    { question: 'How do curvature and refraction corrections affect long-distance levelling sights, and how are they combined?', category: 'practical use' },
    { question: 'What is reciprocal levelling and how does it eliminate errors of collimation, curvature, and refraction across water bodies?', category: 'debugging' },
    { question: 'Explain fly levelling and profile levelling with practical engineering applications.', category: 'practical use' }
  ],
  'Theodolite': [
    { question: 'What are the temporary adjustments of a transit theodolite before taking readings?', category: 'practical use' },
    { question: 'Explain the repetition method and reiteration method for measuring horizontal angles with high precision.', category: 'practical use' },
    { question: 'What is closing error in a closed theodolite traverse and how is Bowditch’s rule applied to adjust it?', category: 'debugging' },
    { question: 'Explain the concept of face left and face right observations and what instrumental errors they eliminate.', category: 'fundamentals' }
  ],
  'GPS': [
    { question: 'Explain the working principle of Global Positioning System (GPS) using satellite trilateration.', category: 'fundamentals' },
    { question: 'What are the three main segments of GPS (Space, Control, and User segments)?', category: 'fundamentals' },
    { question: 'What is Differential GPS (DGPS) and how does it achieve centimeter-level positioning accuracy for surveying?', category: 'practical use' },
    { question: 'Explain the major sources of errors in GPS measurements (ionospheric delay, clock bias, multipath error).', category: 'debugging' }
  ],

  // ==========================================
  // MECHANICAL ENGINEERING QUESTION BANKS
  // ==========================================
  'Mechanical': [
    { question: 'Explain the first and second laws of thermodynamics and define the concept of entropy.', category: 'fundamentals' },
    { question: 'Explain the Otto cycle, Diesel cycle, and Dual cycle with their P-V and T-s diagrams.', category: 'fundamentals' },
    { question: 'What is Bernoulli’s principle in fluid flow and what are its practical limitations?', category: 'practical use' },
    { question: 'Explain the difference between stress concentration factor and fatigue strength reduction factor in machine design.', category: 'fundamentals' }
  ],
  'Thermodynamics': [
    { question: 'Explain the Carnot cycle, its thermodynamic efficiency, and why 100% thermal efficiency is impossible.', category: 'fundamentals' },
    { question: 'Differentiate between intensive and extensive thermodynamic properties with examples.', category: 'fundamentals' },
    { question: 'Explain the Clausius inequality and how it leads to the mathematical definition of entropy.', category: 'fundamentals' },
    { question: 'What is the Rankine cycle used in steam power plants and how does reheat and regeneration improve its thermal efficiency?', category: 'practical use' }
  ],
  'Fluid Mechanics': [
    { question: 'Explain the concept of viscosity, Newtonian vs non-Newtonian fluids, and kinematic viscosity.', category: 'fundamentals' },
    { question: 'What is the Reynolds number and how does it differentiate between laminar and turbulent flow in pipes?', category: 'fundamentals' },
    { question: 'What is cavitation in centrifugal pumps and hydraulic turbines, what causes it, and how is it prevented?', category: 'debugging' },
    { question: 'Explain Darcy-Weisbach equation for calculating head loss due to pipe friction.', category: 'practical use' }
  ],
  'Machine Design': [
    { question: 'Explain the theories of failure (Maximum Shear Stress / Tresca theory vs Distortion Energy / von Mises theory) and when to use each.', category: 'trade-offs' },
    { question: 'How do you design a shaft subjected to combined twisting moment and bending moment using equivalent torque?', category: 'practical use' },
    { question: 'Explain spur, helical, bevel, and worm gears in terms of efficiency, tooth contact, and thrust load.', category: 'fundamentals' },
    { question: 'What is the S-N curve in fatigue design and what is the endurance limit of materials?', category: 'fundamentals' }
  ],
  'Manufacturing': [
    { question: 'Explain the gating system in metal casting (sprue, runner, ingate, riser) and Chvorinov’s rule for solidification time.', category: 'fundamentals' },
    { question: 'What are common welding defects (porosity, undercut, lack of penetration, slag inclusion) and their root causes?', category: 'debugging' },
    { question: 'Explain Merchant’s circle diagram in orthogonal metal cutting and forces acting on the single point cutting tool.', category: 'practical use' },
    { question: 'Explain the working principle and industrial applications of CNC machining and G-codes/M-codes.', category: 'practical use' }
  ],

  // ==========================================
  // ELECTRICAL ENGINEERING QUESTION BANKS
  // ==========================================
  'Electrical': [
    { question: 'Explain the working principle of a 3-phase induction motor and define slip.', category: 'fundamentals' },
    { question: 'Explain transformer efficiency, open-circuit test, short-circuit test, and all-day efficiency.', category: 'practical use' },
    { question: 'What is power factor, why is low power factor penalized, and how is power factor corrected using capacitor banks?', category: 'practical use' },
    { question: 'Explain symmetrical and unsymmetrical faults in electrical power transmission systems.', category: 'debugging' }
  ],
  'Power Systems': [
    { question: 'Explain the transmission line models (short, medium, long) and the Ferranti effect in lightly loaded lines.', category: 'fundamentals' },
    { question: 'What is the per-unit (p.u.) system in power system analysis and what are its major calculation benefits?', category: 'fundamentals' },
    { question: 'Explain the operation of distance protection relays (Mho, reactance, impedance relays) in transmission lines.', category: 'practical use' },
    { question: 'What is transient stability and how is the equal area criterion used to determine critical clearing time?', category: 'practical use' }
  ],
  'Control Systems': [
    { question: 'Explain the difference between open-loop and closed-loop control systems with practical examples.', category: 'fundamentals' },
    { question: 'Explain the Routh-Hurwitz stability criterion and how to determine the number of poles in the right-half s-plane.', category: 'practical use' },
    { question: 'What is a PID controller and how does each component (Proportional, Integral, Derivative) influence system response, steady-state error, and stability?', category: 'practical use' },
    { question: 'Explain gain margin and phase margin on a Bode plot and Nyquist stability criterion.', category: 'fundamentals' }
  ],
  'Electrical Machines': [
    { question: 'Explain the torque-speed characteristics of DC series, shunt, and compound motors, and their industrial applications.', category: 'fundamentals' },
    { question: 'Why does an induction motor never run at synchronous speed, and what happens if rotor speed equals synchronous speed?', category: 'fundamentals' },
    { question: 'Explain the V-curves and inverted V-curves of a synchronous motor at varying field excitation.', category: 'practical use' },
    { question: 'Explain how armature reaction affects the main field flux in DC machines and alternators.', category: 'debugging' }
  ],
  'Measurements': [
    { question: 'Explain the working principle of PMMC instruments vs moving iron (MI) instruments and why PMMC only measures DC.', category: 'fundamentals' },
    { question: 'How is a galvanometer converted into an ammeter (using shunt resistor) and into a voltmeter (using series multiplier)?', category: 'practical use' },
    { question: 'Explain the two-wattmeter method for measuring 3-phase active power and power factor in balanced loads.', category: 'practical use' },
    { question: 'Explain the working of Megger for measuring high insulation resistance.', category: 'practical use' }
  ],

  // ==========================================
  // ENTC QUESTION BANKS
  // ==========================================
  'ENTC': [
    { question: 'Explain the difference between analog and digital communication systems in terms of noise immunity, bandwidth, and fidelity.', category: 'fundamentals' },
    { question: 'Explain Amplitude Modulation (AM) vs Frequency Modulation (FM) and their respective modulation index formulas.', category: 'fundamentals' },
    { question: 'Explain the architecture and pin configuration of the 8085 microprocessor, including data bus and address bus demultiplexing.', category: 'fundamentals' },
    { question: 'Explain an ideal operational amplifier (Op-Amp) characteristics (infinite open-loop gain, infinite input impedance, zero output impedance).', category: 'fundamentals' }
  ],
  'Digital Electronics': [
    { question: 'Explain the differences between combinational logic circuits and sequential logic circuits with examples.', category: 'fundamentals' },
    { question: 'Explain the difference between latches and flip-flops (SR, JK, D, and T flip-flops) and race-around condition in JK flip-flop.', category: 'fundamentals' },
    { question: 'How do you simplify Boolean algebraic expressions using Karnaugh Maps (K-Maps) and handling don’t-care conditions?', category: 'practical use' },
    { question: 'Explain synchronous vs asynchronous (ripple) counters and their propagation delay trade-offs.', category: 'trade-offs' }
  ],
  'Analog Circuits': [
    { question: 'Explain the concept of virtual ground in an inverting operational amplifier and derive its closed-loop gain.', category: 'fundamentals' },
    { question: 'What is Barkhausen criterion for sustained oscillations in oscillator circuits (e.g., Hartley, Colpitts, RC phase shift)?', category: 'fundamentals' },
    { question: 'Compare active filters vs passive filters (Butterworth vs Chebyshev response) in terms of roll-off and passband ripple.', category: 'trade-offs' },
    { question: 'Explain common emitter (CE), common base (CB), and common collector (CC) BJT amplifier configurations.', category: 'fundamentals' }
  ],
  'Communication Systems': [
    { question: 'Explain Nyquist sampling theorem, aliasing effect, and how anti-aliasing filters prevent distortion.', category: 'fundamentals' },
    { question: 'Explain Pulse Code Modulation (PCM) steps: Sampling, Quantization, and Encoding, and define quantization noise.', category: 'practical use' },
    { question: 'What is Phase Shift Keying (BPSK, QPSK) and why is QPSK preferred for higher spectral efficiency?', category: 'trade-offs' },
    { question: 'Explain the basic parameters of antennas: Radiation pattern, directive gain, beamwidth, and input impedance.', category: 'fundamentals' }
  ],
  'Microprocessors': [
    { question: 'Explain the interrupt structure of the 8085 microprocessor (TRAP, RST 7.5, RST 6.5, RST 5.5, INTR) in terms of priority and masking.', category: 'fundamentals' },
    { question: 'Explain the machine cycles and T-states involved in executing an instruction like MVI A, 32H in 8085.', category: 'practical use' },
    { question: 'What is memory mapping (memory mapped I/O vs peripheral mapped I/O) in microprocessor interfacing?', category: 'trade-offs' },
    { question: 'Explain the pipeline architecture in the 8086 microprocessor (Bus Interface Unit and Execution Unit).', category: 'fundamentals' }
  ]
};

const genericBank = [
  { question: 'Explain the core engineering concepts and fundamental scientific principles governing this subject.', category: 'fundamentals' },
  { question: 'How do you apply these principles to solve practical challenges in real-world projects and site operations?', category: 'practical use' },
  { question: 'What are the most common defects, failure modes, or quality issues encountered and how are they diagnosed?', category: 'debugging' },
  { question: 'Discuss the key design trade-offs, standard codes, safety factors, and cost constraints involved in this field.', category: 'trade-offs' },
  { question: 'Walk through the step-by-step engineering calculation or design procedure for a standard component in this subject.', category: 'practical use' },
  { question: 'What are the industry best practices, testing standards, and compliance regulations required for quality assurance?', category: 'fundamentals' },
  { question: 'Describe a complex technical problem in this domain and how you would systematically analyze and resolve it.', category: 'practical use' }
];

/**
 * Resolves questions for a given skill and branch, with case-insensitive and synonym matching
 */
const getQuestionsForSkill = (skill, branch = null) => {
  if (!skill) return genericBank;
  const s = String(skill).trim().toLowerCase();

  // Direct match in questionsBank
  for (const [key, questions] of Object.entries(questionsBank)) {
    if (key.toLowerCase() === s) return questions;
  }

  // Synonym & keyword match
  if (s.includes('beam')) return questionsBank['Beams'];
  if (s.includes('column')) return questionsBank['Columns'];
  if (s.includes('truss')) return questionsBank['Trusses'];
  if (s.includes('frame')) return questionsBank['Frames'];
  if (s.includes('soil')) return questionsBank['Soil Mechanics'];
  if (s.includes('foundation') || s.includes('footing')) return questionsBank['Foundations'];
  if (s.includes('retaining')) return questionsBank['Retaining Walls'];
  if (s.includes('earthquake') || s.includes('seismic')) return questionsBank['Earthquake Engg.'];
  if (s.includes('pavement') || s.includes('road')) return questionsBank['Roads'];
  if (s.includes('railway') || s.includes('track')) return questionsBank['Railways'];
  if (s.includes('traffic')) return questionsBank['Traffic Engg.'];
  if (s.includes('airport') || s.includes('runway')) return questionsBank['Airports'];
  if (s.includes('chain')) return questionsBank['Chain Survey'];
  if (s.includes('level') || s.includes('contour')) return questionsBank['Levelling'];
  if (s.includes('theodolite') || s.includes('traverse')) return questionsBank['Theodolite'];
  if (s.includes('gps') || s.includes('gis')) return questionsBank['GPS'];
  if (s.includes('structural') || s.includes('rcc')) return questionsBank['Structural Engineering'];
  if (s.includes('geotech')) return questionsBank['Geotechnical Engineering'];
  if (s.includes('transport')) return questionsBank['Transportation'];
  if (s.includes('survey')) return questionsBank['Surveying'];
  if (s.includes('civil')) return questionsBank['Civil'];

  if (s.includes('thermo') || s.includes('heat')) return questionsBank['Thermodynamics'];
  if (s.includes('fluid') || s.includes('hydraulic') || s.includes('pump')) return questionsBank['Fluid Mechanics'];
  if (s.includes('machine design') || s.includes('gear') || s.includes('shaft')) return questionsBank['Machine Design'];
  if (s.includes('manufacturing') || s.includes('casting') || s.includes('welding')) return questionsBank['Manufacturing'];
  if (s.includes('mechanical')) return questionsBank['Mechanical'];

  if (s.includes('power system') || s.includes('grid') || s.includes('substation')) return questionsBank['Power Systems'];
  if (s.includes('control system') || s.includes('pid') || s.includes('feedback')) return questionsBank['Control Systems'];
  if (s.includes('electrical machine') || s.includes('motor') || s.includes('transformer')) return questionsBank['Electrical Machines'];
  if (s.includes('instrument') || s.includes('measurement') || s.includes('meter')) return questionsBank['Measurements'];
  if (s.includes('electrical')) return questionsBank['Electrical'];

  if (s.includes('digital') || s.includes('logic gate') || s.includes('flip-flop')) return questionsBank['Digital Electronics'];
  if (s.includes('analog') || s.includes('op-amp') || s.includes('amplifier')) return questionsBank['Analog Circuits'];
  if (s.includes('communication') || s.includes('modulation') || s.includes('antenna')) return questionsBank['Communication Systems'];
  if (s.includes('microprocessor') || s.includes('8085') || s.includes('8086')) return questionsBank['Microprocessors'];
  if (s.includes('entc') || s.includes('telecom')) return questionsBank['ENTC'];

  // Branch level fallback
  if (branch) {
    const b = String(branch).trim().toLowerCase();
    if (b.includes('civil')) return questionsBank['Civil'];
    if (b.includes('mech')) return questionsBank['Mechanical'];
    if (b.includes('elec')) return questionsBank['Electrical'];
    if (b.includes('entc')) return questionsBank['ENTC'];
  }

  return genericBank;
};

module.exports = {
  questionsBank,
  genericBank,
  getQuestionsForSkill
};

