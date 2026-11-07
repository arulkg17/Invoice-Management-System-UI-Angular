using Invoice.UI.Tests.Pages;
using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Tests;

[TestFixture]
public class NavigationTests : UiTest
{
    // menu, item, url ends with, heading on the page (null = the page has no heading)
    [TestCase("Masters", "Categories", "/masters/categories", "Categories")]
    [TestCase("Masters", "Items", "/masters/items", null)]
    [TestCase("Masters", "Customers", "/masters/customers", "Customers")]
    [TestCase("Masters", "Vendors", "/masters/vendors", "Vendors")]
    [TestCase("Masters", "Users", "/masters/users", "Users")]
    [TestCase("Transactions", "Purchase Order", "/transactions/po", "Purchase Orders")]
    [TestCase("Transactions", "Receipt", "/transactions/receipt", "Receipts")]
    [TestCase("Transactions", "Sales Invoice", "/transactions/sales-invoice", "Sales Invoices")]
    [TestCase("Transactions", "Stock", "/transactions/stock", "Stock")]
    public async Task Menu_item_opens_its_screen(string menu, string item, string path, string? heading)
    {
        await Page.GotoAsync("/home");

        await new NavBar(Page).OpenAsync(menu, item);

        await Assertions.Expect(Page).ToHaveURLAsync(new Regex(Regex.Escape(path) + "$"));

        if (heading is not null)
        {
            await Assertions.Expect(Page.GetByRole(AriaRole.Heading, new() { Name = heading, Exact = true })).ToBeVisibleAsync();
        }
    }

    [Test]
    public async Task The_logged_in_user_name_is_shown_in_the_toolbar()
    {
        await Page.GotoAsync("/home");

        await Assertions.Expect(new NavBar(Page).UserButton).ToContainTextAsync(Settings.UserName, new() { IgnoreCase = true });
    }
}
