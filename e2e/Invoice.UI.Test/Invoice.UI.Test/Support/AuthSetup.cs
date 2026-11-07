using Invoice.UI.Tests.Pages;
using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests;

/// <summary>
/// Runs ONCE before all tests: logs in through the real login screen and saves the browser's storage
/// (the JWT lives in localStorage) to a file. Every other test starts already logged in, so no test
/// except the login tests spends time on the login screen.
/// </summary>
[SetUpFixture]
public class AuthSetup
{
    [OneTimeSetUp]
    public async Task LoginOnceAsync()
    {
        await Preflight.CheckAsync();

        Directory.CreateDirectory(Path.GetDirectoryName(Settings.AuthStatePath)!);

        using var playwright = await Playwright.CreateAsync();
        await using var browser = await playwright.Chromium.LaunchAsync(new() { Headless = !Settings.Headed });
        var context = await browser.NewContextAsync(new() { BaseURL = Settings.UiBaseUrl });
        var page = await context.NewPageAsync();

        var login = new LoginPage(page);
        await login.GotoAsync();
        await login.LoginAsync(Settings.UserName, Settings.Password);
        await login.ExpectSuccessAsync();

        await context.StorageStateAsync(new() { Path = Settings.AuthStatePath });
    }
}
