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
  ]
};

const genericBank = [
  { question: 'Explain the core concepts and fundamental principles.', category: 'fundamentals' },
  { question: 'How do you apply this practically in a production environment?', category: 'practical use' },
  { question: 'What are the most common performance or debugging issues you encounter?', category: 'debugging' },
  { question: 'Discuss the key trade-offs compared to alternative approaches.', category: 'trade-offs' },
  { question: 'Write or describe the code for a basic implementation.', category: 'coding' },
  { question: 'What are the best practices for structuring projects?', category: 'fundamentals' },
  { question: 'How do you ensure security and stability?', category: 'practical use' },
  { question: 'Describe a complex problem you solved recently.', category: 'practical use' }
];

module.exports = {
  questionsBank,
  genericBank
};
