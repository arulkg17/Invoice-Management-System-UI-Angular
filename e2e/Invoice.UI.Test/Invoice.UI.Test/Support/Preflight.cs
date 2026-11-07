namespace Invoice.UI.Tests.Support;

/// <summary>Fails the whole run with ONE clear message when the app or the API is not running.</summary>
public static class Preflight
{
    public static async Task CheckAsync()
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };

        await RequireAsync(http, Settings.UiBaseUrl, "the Angular UI",
            "Start it with:  ng serve   (or npm start)");

        // Any HTTP answer is fine here (even 404 or 401): we only need the API to be reachable.
        await RequireAsync(http, Settings.ApiBaseUrl + "/health", "Invoice.CqrsAPI",
            "Start it with:  dotnet run --project Invoice.CqrsAPI   (http://localhost:5064)");
    }

    private static async Task RequireAsync(HttpClient http, string url, string what, string hint)
    {
        try
        {
            using var response = await http.GetAsync(url);
        }
        catch (Exception ex)
        {
            Assert.Fail($"Cannot reach {what} at {url}. {hint}\n({ex.GetType().Name}: {ex.Message})");
        }
    }
}
