# Getting Started with Logging in Python

Logging is an essential aspect of software development that allows developers to track application behavior and diagnose issues over time. In this blog post, we'll explore the basics of logging in Python, including how to replace print statements with log statements, set different logging levels, and log information to files. This introduction will set the foundation for more advanced logging techniques in future posts.

## Why Use Logging?

Many developers start off using print statements to debug their code. While this approach can be effective for small projects, it quickly becomes inadequate as applications grow in complexity. Here are some reasons to incorporate logging into your Python applications:

- **Better Tracking**: Logs provide a historical record of application behavior, making it easier to diagnose issues.
- **Visualization**: Logged data can be piped into visualization software for better insights.
- **Configurability**: You can set different logging levels to control what information gets logged.

## Getting Started with Basic Logging

To get started with logging in Python, we need to import the built-in logging module. Below is a simple example using basic functions:

```python
import logging

def add(x, y):
    return x + y

def subtract(x, y):
    return x - y

def multiply(x, y):
    return x * y

def divide(x, y):
    return x / y

# Sample numbers
num1 = 10
num2 = 5

# Replace print statements with logging
logging.basicConfig(level=logging.DEBUG)
```

### Logging Levels

Python defines five standard logging levels:

- **DEBUG**: Detailed information typically for diagnosing problems.
- **INFO**: Confirmation that things are working as expected.
- **WARNING**: An indication that something unexpected happened.
- **ERROR**: A more serious problem preventing a function from executing.
- **CRITICAL**: A serious error indicating that the program itself may be unable to continue.

By default, the logging level is set to WARNING, meaning that only warnings and higher-level logs will be captured. To change the logging level to DEBUG, use the following code:

```python
logging.basicConfig(level=logging.DEBUG)
```

### Logging to a File

Instead of printing logs to the console, you can log to a file. This is especially useful for maintaining a record of application behavior over time. Here’s how to log to a file:

```python
logging.basicConfig(filename='test_log.log', level=logging.DEBUG)
```

### Customizing Log Format

You can customize the format of your logs to include additional information like timestamps and log levels. Here’s an example of how to format log messages:

```python
logging.basicConfig(
    filename='test_log.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
```

## Example: Using Logging in a Class

Let's take a look at how to implement logging in a class. Here’s a simple example of an employee class:

```python
import logging

class Employee:
    def __init__(self, first_name, last_name):
        self.first_name = first_name
        self.last_name = last_name
        logging.info(f'Created employee: {self.first_name} {self.last_name}')

# Configure logging for the employee class
logging.basicConfig(filename='employee_log.log', level=logging.INFO)

# Create employee instances
emp1 = Employee('John', 'Doe')
emp2 = Employee('Jane', 'Doe')
```

## Conclusion

In this blog post, we introduced the basics of logging in Python. We learned how to replace print statements with logging, set different logging levels, log information to files, and customize log formats.

In the next article, we will dive deeper into more advanced logging topics, including creating separate loggers, adding handlers, and logging information to multiple locations. If you have any questions or feedback, feel free to leave a comment below!

If you found this tutorial helpful, please consider liking and sharing it with others. Your support helps us create more valuable content. Don’t forget to subscribe for future tutorials!

Thank you for reading!