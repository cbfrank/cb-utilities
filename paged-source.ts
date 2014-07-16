module $CB {

    export class PagedSource<T extends $data.Entity, TItem> {
        //reanonly
        totalCount: KnockoutObservable<number>;
        currentPageIndex: KnockoutObservable<number>;
        //readonly
        pagesCount: KnockoutComputed<number>;
        itemsCountOnePage: KnockoutObservable<number>;
        items: KnockoutObservableArray<TItem>;

        //for any operation that will use the action such as ajax, should use it to konw if the action is finished or not
        asyncPromise: $data.IPromise<any>;

        //if the Queryable<T> (source) doesn't ok for items, then assign this property to provide additional process
        processItems: (rawItems: T[]) => $data.IPromise<TItem[]>;

        constructor(public source: $data.Queryable<T>) {
            var self = this;
            this.totalCount = ko.observable(0);
            this.currentPageIndex = ko.observable(-1);
            this.itemsCountOnePage = ko.observable(20);
            this.pagesCount = ko.computed(() => {
                if (self.itemsCountOnePage() <= 0) {
                    return 0;
                }
                return Math.ceil(self.totalCount() / self.itemsCountOnePage());
            }, this);
            this.items = ko.observableArray([]);
            this.asyncPromise = undefined;

            this.currentPageIndex.subscribe((newValue: number) => {
                self.asyncPromise = self.fetchDataOfPage(newValue, false);
            });
            this.itemsCountOnePage.subscribe((newValue: number) => {
                self.asyncPromise = self.fetchDataOfPage(undefined, false);
            });
        }

        fetchDataOfPage(newPageIndex?: number, updateCurrentPageIndex?: boolean): $data.IPromise<TItem[]> {
            if (typeof (this.source) === "undefined" || !this.source) {
                var d = $.Deferred();
                d.resolve([]);
                return d.promise();
            }
            var self = this;
            if (typeof (updateCurrentPageIndex) === "undefined") {
                updateCurrentPageIndex = true;
            }
            if (typeof (newPageIndex) === "undefined") {
                newPageIndex = this.currentPageIndex();
            }
            if (typeof (newPageIndex) !== "number") {
                throw "newPageIndex should be number";
            }
            if (updateCurrentPageIndex) {
                if (newPageIndex != this.currentPageIndex()) {
                    this.currentPageIndex(newPageIndex); //will trigger the fetchDataOfPage again
                    return this.asyncPromise;
                }
            } else {
                if (newPageIndex != this.currentPageIndex()) {
                    throw "newPageIndex is not same as current page index but updateCurrentPageIndex is false";
                }
            }
            var tempResult = ko.observableArray([]);
            var result = this.source
                .skip(newPageIndex * this.itemsCountOnePage())
                .take(this.itemsCountOnePage())
                .toArray(tempResult);
            if (typeof (self.processItems) !== "undefined") {
                result = result
                    .then(() => self.processItems(tempResult()))
                    .then((items: TItem[]) => {
                        self.items(items);
                    });
            } else {
                self.items(tempResult());
            }

            this.asyncPromise = result;
            return <any>result;
        }
    }
}
