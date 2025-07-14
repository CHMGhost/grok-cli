---
title: JavaScript Array Methods
tags: [javascript, arrays, methods]
category: JavaScript
---

# JavaScript Array Methods

Common array methods for data manipulation:

## map()
Transforms each element in an array:
```javascript
const doubled = numbers.map(n => n * 2);
```

## filter()
Creates a new array with elements that pass a test:
```javascript
const evens = numbers.filter(n => n % 2 === 0);
```

## reduce()
Reduces an array to a single value:
```javascript
const sum = numbers.reduce((acc, n) => acc + n, 0);
```

## forEach()
Executes a function for each array element:
```javascript
numbers.forEach(n => console.log(n));
```

## find()
Returns the first element that matches a condition:
```javascript
const found = users.find(user => user.id === targetId);
```