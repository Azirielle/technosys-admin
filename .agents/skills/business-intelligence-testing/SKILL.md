---
name: business-intelligence-testing
description: "Use when performing What-If Analysis, Sensitivity Analysis, and Goal Seeking on system features, inputs, and business logic to detect bugs, loopholes, and verify stability."
version: "1.0.0"
---

# Business Intelligence Testing (What-If, Sensitivity, and Goal Seeking)

This skill outlines how to apply business intelligence and logic methodologies to verify software system features, find loopholes, and validate calculations.

## 1. What-If Analysis (Boundary & Out-of-Context Testing)
What-If Analysis explores the behavior of the system under unexpected, extreme, or out-of-context changes to inputs. 

### Guidelines:
*   **Out-of-Context Inputs**: Test fields with non-standard text encodings (e.g., Emojis, foreign alphabets, ancient scripts like Baybayin, non-ASCII characters).
*   **Malicious & Injection Inputs**: Verify resistance to SQL injection patterns, XSS, and HTML tags in forms.
*   **Extreme Ranges**: Input values that exceed typical bounds (e.g., negative wages, zero-quantity restocks, timestamps set in the future).
*   **System Response**: Document if the system gracefully rejects, sanitizes, or fails (and whether it fails with a generic error page, database mismatch, or silent corruption).

## 2. Sensitivity Analysis (Variable Impact Isolation)
Sensitivity Analysis isolates a single input parameter and changes it incrementally while keeping all other variables constant. This identifies the parameters that the system is most "sensitive" or vulnerable to.

### Guidelines:
*   **Parameter Isolation**: Choose one variable (e.g., coordinates proximity, GPS accuracy, time drift margin, SSS salary threshold).
*   **Step Increments**: Incrementally adjust the variable (e.g., moving geofence coordinates by 5 meters, 10 meters, 49 meters, 50 meters, 51 meters).
*   **Determine Breaking Points**: Identify the exact threshold where the behavior flips (e.g., where `geofence_status` changes from `inside` to `outside`).
*   **Stability Auditing**: Verify that small changes do not cause disproportionately large, erratic, or cascading calculation errors (especially in payroll computations).

## 3. Goal Seeking (Backward Tracing & Forecasting)
Goal Seeking starts with a desired final output state and works backward to identify the necessary inputs and paths required to achieve it. It verifies that the finalized system flow is robust and has no logical dead ends.

### Guidelines:
*   **Start at the Final State**: Define the success criteria (e.g., a fully closed support ticket, a finalized payroll sheet with correct SSS/PhilHealth deductions, or a valid time-in record).
*   **Trace Step-by-Step Backwards**: Work backward to find the exact database states, profile configurations, and triggers required (e.g., what user roles, branch associations, and schedule assignments are prerequisites).
*   **State Machine Verification**: Verify that there are no states where a user can get permanently stuck or bypass mandatory steps.
*   **Forecasting Alignment**: Check that the finalized system behavior matches the initial design specifications.
