export const LANGUAGES = {
  javascript: {
    id:      'javascript',
    label:   'JavaScript',
    short:   'JS',
    monaco:  'javascript',
    color:   '#f7df1e',
    bg:      'rgba(247,223,30,.13)',
    ext:     'index.js',
    starter: `// JavaScript — Node.js
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Print first 10 Fibonacci numbers
console.log('Fibonacci sequence:');
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}

// Async example
async function fetchData() {
  const data = await Promise.resolve({ status: 'ok', time: Date.now() });
  console.log('\\nAsync result:', JSON.stringify(data));
}

fetchData();
`,
  },
  python: {
    id:      'python',
    label:   'Python',
    short:   'PY',
    monaco:  'python',
    color:   '#4EC9B0',
    bg:      'rgba(78,201,176,.15)',
    ext:     'main.py',
    starter: `# Python 3
import math
import time

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print("Fibonacci sequence:")
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")

# List comprehension
squares = [x**2 for x in range(1, 11)]
print(f"\\nSquares 1-10: {squares}")

# Math
print(f"\\nMath: π = {math.pi:.6f}")
print(f"e = {math.e:.6f}")

start = time.time()
result = sum(range(1_000_000))
elapsed = time.time() - start
print(f"\\nSum 0..999999 = {result}")
print(f"Computed in {elapsed*1000:.2f}ms")
`,
  },
  cpp: {
    id:      'cpp',
    label:   'C++',
    short:   'C+',
    monaco:  'cpp',
    color:   '#9CDCFE',
    bg:      'rgba(156,220,254,.15)',
    ext:     'main.cpp',
    starter: `// C++17
#include <iostream>
#include <vector>
#include <algorithm>
#include <chrono>
using namespace std;
using namespace chrono;

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    cout << "Fibonacci sequence:" << endl;
    for (int i = 0; i < 10; i++) {
        cout << "F(" << i << ") = " << fibonacci(i) << endl;
    }

    // Vector + sort
    vector<int> nums = {5, 2, 8, 1, 9, 3, 7, 4, 6, 0};
    sort(nums.begin(), nums.end());
    cout << "\\nSorted: ";
    for (int n : nums) cout << n << " ";
    cout << endl;

    // Timing
    auto start = high_resolution_clock::now();
    long long sum = 0;
    for (int i = 0; i < 1'000'000; i++) sum += i;
    auto end = high_resolution_clock::now();
    auto ms = duration_cast<microseconds>(end - start).count();
    cout << "\\nSum 0..999999 = " << sum << endl;
    cout << "Computed in " << ms << "μs" << endl;

    return 0;
}
`,
  },
  java: {
    id:      'java',
    label:   'Java',
    short:   'JV',
    monaco:  'java',
    color:   '#ed8b00',
    bg:      'rgba(237,139,0,.15)',
    ext:     'Main.java',
    starter: `// Java 17
import java.util.*;
import java.util.stream.*;

public class Main {
    static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    public static void main(String[] args) {
        System.out.println("Fibonacci sequence:");
        for (int i = 0; i < 10; i++) {
            System.out.printf("F(%d) = %d%n", i, fibonacci(i));
        }

        // Streams
        List<Integer> nums = Arrays.asList(5, 2, 8, 1, 9, 3, 7, 4, 6, 0);
        List<Integer> sorted = nums.stream().sorted().collect(Collectors.toList());
        System.out.println("\\nSorted: " + sorted);

        // Timing
        long start = System.nanoTime();
        long sum = LongStream.range(0, 1_000_000).sum();
        long elapsed = System.nanoTime() - start;
        System.out.printf("\\nSum 0..999999 = %d%n", sum);
        System.out.printf("Computed in %.2fms%n", elapsed / 1_000_000.0);
    }
}
`,
  },
  typescript: {
    id:      'typescript',
    label:   'TypeScript',
    short:   'TS',
    monaco:  'typescript',
    color:   '#4FC1FF',
    bg:      'rgba(79,193,255,.15)',
    ext:     'main.ts',
    starter: `// TypeScript
interface User {
  id: number;
  name: string;
  role: 'admin' | 'user' | 'guest';
}

function greet(user: User): string {
  return \`Hello, \${user.name}! You are a \${user.role}.\`;
}

const users: User[] = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob',   role: 'user' },
  { id: 3, name: 'Carol', role: 'guest' },
];

users.forEach(u => console.log(greet(u)));

// Generic function
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

console.log('\\nFirst user:', first(users)?.name);

// Async/await
async function loadData(): Promise<{ count: number; ts: string }> {
  await new Promise(r => setTimeout(r, 10));
  return { count: users.length, ts: new Date().toISOString() };
}

loadData().then(d => console.log('\\nData loaded:', JSON.stringify(d)));
`,
  },
  go: {
    id:      'go',
    label:   'Go',
    short:   'GO',
    monaco:  'go',
    color:   '#00acd7',
    bg:      'rgba(0,172,215,.15)',
    ext:     'main.go',
    starter: `// Go 1.21
package main

import (
    "fmt"
    "math"
    "sort"
    "time"
)

func fibonacci(n int) int {
    if n <= 1 { return n }
    return fibonacci(n-1) + fibonacci(n-2)
}

func main() {
    fmt.Println("Fibonacci sequence:")
    for i := 0; i < 10; i++ {
        fmt.Printf("F(%d) = %d\\n", i, fibonacci(i))
    }

    // Slice + sort
    nums := []int{5, 2, 8, 1, 9, 3, 7, 4, 6, 0}
    sort.Ints(nums)
    fmt.Println("\\nSorted:", nums)

    // Math
    fmt.Printf("\\nπ = %.6f\\n", math.Pi)

    // Goroutine timing
    start := time.Now()
    sum := 0
    for i := 0; i < 1_000_000; i++ { sum += i }
    fmt.Printf("Sum 0..999999 = %d\\n", sum)
    fmt.Printf("Computed in %v\\n", time.Since(start))
}
`,
  },
};

export const DEFAULT_LANG = 'javascript';

export function getLanguage(id) {
  return LANGUAGES[id] || LANGUAGES[DEFAULT_LANG];
}
