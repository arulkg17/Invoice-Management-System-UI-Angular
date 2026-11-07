namespace Invoice.UI.Tests.Support;

// The Angular forms limit the field lengths, so the generated values stay inside them:
//   Category: code 5, name 25   Item: code 10, bar code 25   Customer / Vendor: code 20   PO / Receipt / Invoice number: 30

public sealed record CategoryData(string Code, string Name, string Description);

public sealed record ItemData(string Code, string BarCode, string Name, string Uom, decimal Rate, decimal MinimumStock, decimal MaximumStock);

public sealed record PartyData(string Code, string Name, string City, string State);

public sealed record UserData(
    string UserName, string Email, string Password, string FirstName, string LastName,
    string Phone, string Address, string City, string State, string Zip, string Country);

public static class TestData
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /// <summary>Random upper-case token. Every run creates new codes, so reruns never collide with old data.</summary>
    public static string Token(int length) =>
        new(Enumerable.Range(0, length).Select(_ => Alphabet[Random.Shared.Next(Alphabet.Length)]).ToArray());

    public static CategoryData Category() => new("T" + Token(4), "Cat " + Token(6), "Created by Playwright");

    public static ItemData Item() => new("I" + Token(6), "BC" + Token(8), "Item " + Token(6), "NOS", 100, 5, 500);

    public static PartyData Customer() => new("C" + Token(7), "Cust " + Token(6), "Chennai", "Tamil Nadu");

    public static PartyData Vendor() => new("V" + Token(7), "Vend " + Token(6), "Madurai", "Tamil Nadu");

    public static UserData User()
    {
        var name = "ui" + Token(8).ToLowerInvariant();
        return new(name, $"{name}@example.com", "Passw0rd!", "Pw", "Tester", "9876543210",
                   "1 Main Road", "Chennai", "Tamil Nadu", "600001", "India");
    }

    public static string PoNumber() => "PO-" + Token(8);
    public static string ReceiptNumber() => "GRN-" + Token(8);
    public static string InvoiceNumber() => "INV-" + Token(8);

    public static string Number(decimal value) => value.ToString(CultureInfo.InvariantCulture);
}
