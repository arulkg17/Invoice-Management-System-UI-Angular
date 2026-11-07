using NUnit.Framework.Interfaces;

namespace Invoice.UI.Tests.Support;

/// <summary>
/// Base class of every UI test: a fresh browser context per test (already logged in unless a test says otherwise),
/// a trace for every test, and a screenshot + saved trace when a test fails.
/// Open a failure trace with:  pwsh bin/Debug/net10.0/playwright.ps1 show-trace &lt;file.zip&gt;
/// </summary>
public abstract class UiTest : PageTest
{
    static UiTest()
    {
        Assertions.SetDefaultExpectTimeout(10_000);
    }

    /// <summary>The login tests override this: they must start logged OUT.</summary>
    protected virtual bool StartLoggedIn => true;

    public override BrowserNewContextOptions ContextOptions()
    {
        var options = new BrowserNewContextOptions
        {
            BaseURL = Settings.UiBaseUrl,
            ViewportSize = new ViewportSize { Width = 1440, Height = 900 },
            Locale = "en-US",
            TimezoneId = "Asia/Kolkata"
        };

        if (StartLoggedIn) options.StorageStatePath = Settings.AuthStatePath;
        if (Settings.Video) options.RecordVideoDir = Path.Combine(Settings.ArtifactsDir, "videos");

        return options;
    }

    [SetUp]
    public async Task StartTracing()
    {
        Page.SetDefaultTimeout(15_000);

        await Context.Tracing.StartAsync(new()
        {
            Screenshots = true,
            Snapshots = true,
            Sources = true
        });
    }

    [TearDown]
    public async Task SaveEvidenceOnFailure()
    {
        var failed = TestContext.CurrentContext.Result.Outcome.Status == TestStatus.Failed;

        if (!failed)
        {
            await Context.Tracing.StopAsync();
            return;
        }

        var name = Regex.Replace(TestContext.CurrentContext.Test.FullName, @"[^\w\-.]+", "_");
        var folder = Path.Combine(Settings.ArtifactsDir, "failures");
        Directory.CreateDirectory(folder);

        await Page.ScreenshotAsync(new() { Path = Path.Combine(folder, name + ".png"), FullPage = true });
        await Context.Tracing.StopAsync(new() { Path = Path.Combine(folder, name + ".zip") });
    }
}
