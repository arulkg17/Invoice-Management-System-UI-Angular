using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Pages;

/// <summary>Purchase Order, Receipt and Sales Invoice lists share one layout: search by number, status badge, icon actions.</summary>
public class DocumentListPage
{
    private readonly string _route;
    private readonly string _addButton;
    private readonly string _searchLabel;

    protected DocumentListPage(IPage page, string route, string addButton, string searchLabel)
    {
        Page = page;
        _route = route;
        _addButton = addButton;
        _searchLabel = searchLabel;
    }

    public IPage Page { get; }

    public ILocator AddButton => Page.GetByRole(AriaRole.Button, new() { Name = _addButton });

    public async Task OpenAsync()
    {
        await Page.GotoAsync(_route);
        await Assertions.Expect(AddButton).ToBeVisibleAsync();
    }

    public Task AddAsync() => AddButton.ClickAsync();

    public async Task FindAsync(string number)
    {
        await Page.GetByLabel(Ui.Exactly(_searchLabel)).FillAsync(number);
        await Assertions.Expect(Row(number)).ToBeVisibleAsync();
    }

    public ILocator Row(string number) => Page.TableRow(number);

    public ILocator StatusBadge(string number) => Row(number).Locator(".status-badge");

    public Task ExpectStatusAsync(string number, string status) =>
        Assertions.Expect(StatusBadge(number)).ToHaveTextAsync(status);

    /// <summary>
    /// Clicks an icon button of the row. Icons used by the lists:
    /// picture_as_pdf, edit (Draft) / visibility (other statuses), fact_check (verify + approve a PO),
    /// check_circle (post), block (cancel), delete.
    /// </summary>
    public Task ClickActionAsync(string number, string icon) => Row(number).IconButton(icon).ClickAsync();

    public Task ExpectActionAsync(string number, string icon, bool visible) =>
        visible
            ? Assertions.Expect(Row(number).IconButton(icon)).ToBeVisibleAsync()
            : Assertions.Expect(Row(number).IconButton(icon)).ToHaveCountAsync(0);
}

public sealed class PurchaseOrdersPage : DocumentListPage
{
    public PurchaseOrdersPage(IPage page) : base(page, "/transactions/po", "New Purchase Order", "PO Number") { }
}

public sealed class ReceiptsPage : DocumentListPage
{
    public ReceiptsPage(IPage page) : base(page, "/transactions/receipt", "New Receipt", "Receipt Number") { }
}

public sealed class SalesInvoicesPage : DocumentListPage
{
    public SalesInvoicesPage(IPage page) : base(page, "/transactions/sales-invoice", "New Sales Invoice", "Invoice Number") { }
}

/// <summary>The item lines table of the Purchase Order and Sales Invoice forms.</summary>
public sealed class DocumentLines
{
    private readonly IPage _page;

    public DocumentLines(IPage page) => _page = page;

    public ILocator Rows => _page.Locator("table.lines tbody tr:not(.error-row)");

    public Task AddAsync() => _page.GetByRole(AriaRole.Button, new() { Name = "Add Item" }).ClickAsync();

    /// <summary>Fills line <paramref name="index"/> (0 = the line that is already on a new form).</summary>
    public async Task SetAsync(int index, string itemCode, decimal quantity, decimal rate, decimal discount = 0, decimal taxPercent = 0)
    {
        var row = Rows.Nth(index);

        // Picking an item may default the rate, so choose the item first and then type the rate.
        await _page.ChooseOptionAsync(row.Locator("mat-select"), $"{itemCode} - ");
        await row.Locator("[formcontrolname='quantity']").FillAsync(TestData.Number(quantity));
        await row.Locator("[formcontrolname='rate']").FillAsync(TestData.Number(rate));
        await row.Locator("[formcontrolname='discountAmount']").FillAsync(TestData.Number(discount));
        await row.Locator("[formcontrolname='taxPercent']").FillAsync(TestData.Number(taxPercent));
    }
}

public sealed class PurchaseOrderForm : FormBase
{
    public PurchaseOrderForm(IPage page) : base(page) => Lines = new DocumentLines(page);

    public DocumentLines Lines { get; }

    public ILocator Heading => Page.GetByRole(AriaRole.Heading, new() { Level = 2 });
    public ILocator Banner => Page.Locator(".banner");
    public ILocator GrandTotal => Page.Locator(".totals .grand b");

    public Task SetNumberAsync(string number) => Field("PO Number").FillAsync(number);

    public Task ChooseVendorAsync(string vendorCode) => Page.ChooseOptionAsync(Select("Vendor"), $"{vendorCode} - ");

    public Task SetNotesAsync(string notes) => Field("Notes").FillAsync(notes);
}

public sealed class ReceiptForm : FormBase
{
    public ReceiptForm(IPage page) : base(page) { }

    public Task SetNumberAsync(string number) => Field("Receipt Number").FillAsync(number);

    /// <summary>Only Approved / PartiallyReceived orders are offered, shown as "PO-123 (Approved)".</summary>
    public async Task ChoosePurchaseOrderAsync(string poNumber)
    {
        await Page.ChooseOptionAsync(Select("Purchase Order"), $"{poNumber} (");

        // The lines are built from the purchase order after a server call; "Receive now" defaults to what is outstanding.
        var receiveNow = Page.Locator("[formcontrolname='receivedQuantity']").First;
        await Assertions.Expect(receiveNow).ToHaveValueAsync(new Regex("[1-9]"));
    }
}

public sealed class SalesInvoiceForm : FormBase
{
    public SalesInvoiceForm(IPage page) : base(page) => Lines = new DocumentLines(page);

    public DocumentLines Lines { get; }

    public Task SetNumberAsync(string number) => Field("Invoice Number").FillAsync(number);

    public Task ChooseCustomerAsync(string customerCode) => Page.ChooseOptionAsync(Select("Customer"), $"{customerCode} - ");
}

/// <summary>Stock is read only: a searchable table of received, sold and on-hand quantities.</summary>
public sealed class StockPage
{
    private readonly IPage _page;

    public StockPage(IPage page) => _page = page;

    public async Task OpenAsync()
    {
        await _page.GotoAsync("/transactions/stock");
        await Assertions.Expect(_page.GetByRole(AriaRole.Heading, new() { Name = "Stock" })).ToBeVisibleAsync();
    }

    public async Task SearchAsync(string itemCode)
    {
        await _page.GetByLabel(Ui.Exactly("Search item")).FillAsync(itemCode);
        await Assertions.Expect(_page.TableRow(itemCode)).ToBeVisibleAsync();
    }

    /// <summary>Waits until the On Hand cell of the item shows this number (12, 12.00 and 12.5 all work).</summary>
    public async Task ExpectOnHandAsync(string itemCode, decimal quantity)
    {
        await OpenAsync();
        await SearchAsync(itemCode);

        var cell = _page.TableRow(itemCode).Locator("td.mat-column-onHandQuantity");
        var number = Regex.Escape(TestData.Number(quantity));

        await Assertions.Expect(cell).ToHaveTextAsync(new Regex($"^\\s*{number}(\\.0+)?\\s*$"));
    }
}
