@echo off
echo ==== 1. Cleaning Sub-Repositories ====
if exist "frontend\.git" rmdir /s /q "frontend\.git"
if exist "backend\.git" rmdir /s /q "backend\.git"

echo ==== 2. Initializing Git ====
git init

echo ==== 3. Staging Files (Using new .gitignore) ====
git add .

echo ==== 4. Committing ====
git commit -m "First commit: Complete SEO Engine"

echo ==== 5. Setting up Branch and Remote ====
git branch -M main
git remote add origin https://github.com/mohamed-bella/bellaseo.git

echo ==== 6. Pushing to GitHub ====
git push -u origin main

echo Done! Check your GitHub repository.
pause
