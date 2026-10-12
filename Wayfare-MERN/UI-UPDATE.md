# Wayfare update

## This update
- Removed document upload/download controls and their API routes.
- Removed Travel Together, email invitations, dashboard invitation controls, and invitation/member-management routes.
- Preserved existing stored records and legacy trip access; this update does not erase existing data.
- Added unique, case-insensitive usernames (3–30 letters, numbers, or underscores). New users choose one during registration. Existing users can add one in Profile. Login accepts either email or username with the existing password.
- Kept Google sign-in and email verification/password reset.
- Added ocean blue, lavender, and gold accents to cards, itinerary days, budgets, and account screens in both light and dark modes.

## Running
Use the existing README commands. No additional environment variables or dependencies are required. The normal server startup creates a sparse unique username index so accounts without a username continue working.

## Validation
Production build and all 32 automated tests passed. Username tests cover normalization, password/session handling, profile updates, duplicate names, and compatibility for existing accounts. See the existing npm test suite for MongoDB integration coverage.
