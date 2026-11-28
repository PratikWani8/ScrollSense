# Security Policy

## ScrollSense

ScrollSense is an AI-powered, privacy-first digital wellbeing platform designed to help users understand and manage their desktop short-video consumption across Instagram Reels and YouTube Shorts.

We take security and user privacy seriously. This document outlines our supported versions, security practices, and procedures for reporting vulnerabilities.

## Supported Versions

Security updates are prioritized for the latest maintained version of ScrollSense.

| Version | Supported |
|---|---|
| Latest release | Yes |
| Previous releases | Limited |
| Older releases | No |

Users are encouraged to use the latest version to receive security improvements and bug fixes.

## Reporting a Vulnerability

If you discover a security vulnerability in ScrollSense, please report it responsibly.

**Do not disclose security vulnerabilities publicly before they have been reviewed and addressed.**

### How to Report

Please report vulnerabilities through one of the following channels:

- GitHub Security Advisories: https://github.com/PratikWani8/ScrollSense/security/advisories
- GitHub private vulnerability reporting, if enabled for the repository.

Include the following information in your report:

1. A clear description of the vulnerability.
2. Steps to reproduce the issue.
3. Potential security impact.
4. Screenshots or proof-of-concept code, if applicable.
5. Suggested mitigation, if known.

### Response Process

We aim to follow this responsible disclosure process:

1. Acknowledge the report as soon as reasonably possible.
2. Investigate and validate the reported vulnerability.
3. Assess its severity and potential impact.
4. Develop and test an appropriate security fix.
5. Release the fix and publish relevant security information when appropriate.

Please allow reasonable time for investigation and remediation before making a vulnerability public.

## Security Best Practices

ScrollSense follows security-conscious development practices across its application components.

### 1. Browser Extension Security

- Uses Chrome Extension Manifest V3.
- Follows the principle of least privilege when requesting browser permissions.
- Avoids unnecessary access to browser APIs and website content.
- Restricts extension communication to authorized components.
- Avoids executing remotely hosted JavaScript.
- Uses secure message handling between extension components.

### 2. Data Privacy

- Prioritizes user privacy and data minimization.
- Collects only information necessary for the application's functionality.
- Avoids collecting passwords, payment information, or unrelated browsing activity.
- Handles browsing-related activity data responsibly.
- Does not intentionally expose private user activity to unauthorized parties.

### 3. Backend Security

- Validates and sanitizes incoming API requests.
- Uses environment variables for sensitive configuration.
- Avoids exposing internal server errors and sensitive information.
- Applies appropriate access controls to protected endpoints.
- Uses secure database access practices.

### 4. AI Security

- Protects AI provider credentials using environment variables.
- Avoids exposing API keys in frontend or browser extension code.
- Treats user-provided content as untrusted input.
- Applies appropriate validation to AI-related requests and responses.

### 5. Dependency Security

- Uses maintained dependencies wherever possible.
- Reviews dependency updates for potential security issues.
- Encourages vulnerability scanning and dependency auditing.
- Removes unnecessary or outdated packages.

## Security Recommendations for Users

To improve your security while using ScrollSense:

- Install ScrollSense only from trusted sources.
- Keep your browser and extension updated.
- Avoid sharing private activity data or sensitive logs publicly.
- Do not share API keys, environment files, or authentication credentials.
- Report suspicious behavior through the recommended reporting channels.

## Scope

Security reports related to the following areas are particularly welcome:

- Unauthorized access to user data.
- Authentication and authorization vulnerabilities.
- API security issues.
- Browser extension permission abuse.
- Cross-site scripting (XSS).
- Injection vulnerabilities.
- Sensitive information exposure.
- Insecure data storage or transmission.
- AI API credential exposure.

## Responsible Disclosure

We appreciate the work of security researchers and contributors who help make ScrollSense safer.

Please act in good faith, avoid accessing or modifying other users' data, and do not disrupt application services during security testing.

We reserve the right to determine the appropriate remediation and disclosure timeline based on the severity and nature of each vulnerability.

## Contact

**Project:** ScrollSense

**Repository:** https://github.com/PratikWani8/ScrollSense

**Maintainer:** Pratik Wani

Thank you for helping make ScrollSense more secure and privacy-conscious.