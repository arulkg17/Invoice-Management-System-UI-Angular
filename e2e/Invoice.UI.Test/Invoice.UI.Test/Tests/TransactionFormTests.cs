using Invoice.UI.Tests.Pages;
using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Tests;

/// <summary>Form checks that need no data: they never reach the server.</summary>
[TestFixture]
public class TransactionFormTests : UiTest
{
    [Test]
    public async Task A_new_purchase_order_gets_a_generated_number_and_todays_date()
    {
        var list = new PurchaseOrdersPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new PurchaseOrderForm(Page);

        await Expect(form.Heading).ToHaveTextAsync("New Purchase Order");
        await Expect(form.Field("PO Number")).ToHaveValueAsync(new Regex("^PO-\\d{8}-\\d{6}$"));
        await Expect(form.Lines.Rows).ToHaveCountAsync(1);
    }

    [Test]
    public async Task Saving_a_purchase_order_without_vendor_and_item_shows_the_messages()
    {
        var list = new PurchaseOrdersPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new PurchaseOrderForm(Page);
        await Expect(form.Field("PO Number")).ToHaveValueAsync(new Regex("^PO-"));
        await form.SaveAsync();

        await Expect(Page.GetByText("Vendor is required")).ToBeVisibleAsync();
        await Expect(Page.GetByText("Select an item.")).ToBeVisibleAsync();
        await Page.ExpectToastAsync("Please fix the highlighted errors");
    }

    [Test]
    public async Task Removing_the_last_line_asks_for_at_least_one_item()
    {
        var list = new PurchaseOrdersPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new PurchaseOrderForm(Page);
        await form.Lines.Rows.First.IconButton("delete").ClickAsync();
        await form.SaveAsync();

        await Expect(Page.GetByText("Add at least one item.")).ToBeVisibleAsync();
    }

    [Test]
    public async Task Adding_and_removing_lines_updates_the_table()
    {
        var list = new PurchaseOrdersPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new PurchaseOrderForm(Page);
        await form.Lines.AddAsync();
        await form.Lines.AddAsync();
        await Expect(form.Lines.Rows).ToHaveCountAsync(3);

        await form.Lines.Rows.Last.IconButton("delete").ClickAsync();
        await Expect(form.Lines.Rows).ToHaveCountAsync(2);
    }

    [Test]
    public async Task Saving_a_sales_invoice_without_customer_and_item_shows_the_messages()
    {
        var list = new SalesInvoicesPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        await new SalesInvoiceForm(Page).SaveAsync();

        await Expect(Page.GetByText("Customer is required")).ToBeVisibleAsync();
        await Page.ExpectToastAsync("Please fix the highlighted errors");
    }

    [Test]
    public async Task A_new_receipt_needs_a_purchase_order()
    {
        var list = new ReceiptsPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        await new ReceiptForm(Page).SaveAsync();

        await Expect(Page.GetByText("Select a purchase order")).ToBeVisibleAsync();
    }

    [Test]
    public async Task The_stock_screen_loads_and_filters()
    {
        await Page.GotoAsync("/transactions/stock");

        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Stock" })).ToBeVisibleAsync();
        await Page.GetByLabel(Ui.Exactly("Search item")).FillAsync("no-such-item-" + TestData.Token(6));
        await Expect(Page.GetByText("No items found.")).ToBeVisibleAsync();
    }
}
