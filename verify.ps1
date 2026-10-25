# verify.ps1 — Automated Project Verification Runner
#
# PURPOSE: Executes deterministic sanity checks across types, tests, and build.
# Run automatically by the AI before declaring any task complete.
# Exit code 0 = Green / Passed. Non-zero = Red / Failed.

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "   RUNNING PROJECT SELF-VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Step 1: Typecheck / Syntax Check
Write-Host "`n[1/3] Checking types and syntax..." -ForegroundColor Yellow
if (Test-Path "tsconfig.json") {
    npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Typecheck failed! Check TypeScript compiler errors above."
        exit 1
    }
    Write-Host "  -> TypeScript check: PASSED" -ForegroundColor Green
} elseif (Test-Path "pyproject.toml") {
    python -m ruff check .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Python lint/typecheck failed!"
        exit 1
    }
    Write-Host "  -> Python lint: PASSED" -ForegroundColor Green
} else {
    Write-Host "  -> No type configuration found; skipping typecheck." -ForegroundColor DarkGray
}

# Step 2: Unit / Integration Tests
Write-Host "`n[2/3] Running automated tests..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    # Check if a test script is defined in package.json
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.scripts.test -and $packageJson.scripts.test -notmatch "no test specified") {
        npm test -- --run
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Automated tests failed! Fix test assertions above."
            exit 1
        }
        Write-Host "  -> Tests: PASSED" -ForegroundColor Green
    } else {
        Write-Host "  -> No test script configured in package.json; skipping tests." -ForegroundColor DarkGray
    }
} elseif (Test-Path "pytest.ini" -or (Get-ChildItem -Filter "test_*.py" -Recurse).Count -gt 0) {
    pytest
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Pytest suite failed!"
        exit 1
    }
    Write-Host "  -> Pytest: PASSED" -ForegroundColor Green
} else {
    Write-Host "  -> No tests detected; skipping." -ForegroundColor DarkGray
}

# Step 3: Production Build Sanity
Write-Host "`n[3/3] Checking production build..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.scripts.build) {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Production build failed! Check build logs above."
            exit 1
        }
        Write-Host "  -> Build: PASSED" -ForegroundColor Green
    } else {
        Write-Host "  -> No build script configured; skipping build." -ForegroundColor DarkGray
    }
}

$Elapsed = [math]::Round(((Get-Date) - $StartTime).TotalSeconds, 2)
Write-Host "`n===============================================" -ForegroundColor Green
Write-Host "   VERIFICATION PASSED (Completed in ${Elapsed}s)" -ForegroundColor Green
Write-Host "===============================================`n" -ForegroundColor Green

exit 0
