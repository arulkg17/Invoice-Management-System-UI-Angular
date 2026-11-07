namespace Invoice.UI.Tests.Support;

/// <summary>Everything that changes between your laptop and CI comes from environment variables.</summary>
public static class Settings
{
    /// <summary>The Angular app.</summary>
    public static string UiBaseUrl => Env("UI_BASE_URL", "http://localhost:4200");

    /// <summary>Invoice.CqrsAPI. The Angular app (src/environments/environment.ts apiUrl) must point at it.</summary>
    public static string ApiBaseUrl => Env("API_BASE_URL", "http://localhost:5064");

    /// <summary>A user that exists in the test database (the Angular login screen is pre-filled with admin / Admin@123).</summary>
    public static string UserName => Env("UI_USER", "admin");
    public static string Password => Env("UI_PASSWORD", "Admin@123");

    /// <summary>HEADED=1 shows the browser. SLOWMO=300 slows every action by 300 ms (nice for the class).</summary>
    public static bool Headed => Env("HEADED", "0") == "1";
    public static float SlowMo => float.TryParse(Env("SLOWMO", "0"), out var ms) ? ms : 0;

    /// <summary>VIDEO=1 records a video of every test (traces and failure screenshots are always on).</summary>
    public static bool Video => Env("VIDEO", "0") == "1";

    public static string ArtifactsDir => Env("ARTIFACTS_DIR", Path.Combine(AppContext.BaseDirectory, "artifacts"));

    public static string AuthStatePath => Path.Combine(ArtifactsDir, ".auth", "state.json");

    private static string Env(string name, string fallback)
    {
        var value = Environment.GetEnvironmentVariable(name);
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }
}
