import React from "react";
import Link from 'react-router-dom/Link';
import Loading from "shared/Loading";
import LoadingError from "shared/LoadingError";
import CategoryStore from "stores/CategoryStore";
import EngineStore from "stores/EngineStore";
import * as CategoryActions from "actions/CategoryActions";
import * as SolutionActions from "actions/SolutionActions";
import * as EngineActions from "actions/EngineActions";
import UserStore from "stores/UserStore";
import debounce from "lodash/debounce";
import ProductDataRows from "./ProductDataRows";
import ComparisonDataRows from "marketplace/comparison/ComparisonDataRows";
import AdditionalInfoRows from "marketplace/comparison/AdditionalInfoRows";
import TableHeader from "marketplace/comparison/TableHeader";
import Insights from "marketplace/comparison/Insights";
import OtherProducts from "marketplace/comparison/OtherProducts";
import orderby from "lodash/orderBy";
import Settings from 'Settings';
import ProductLink from "shared/ProductLink";
import * as Helpers from "helpers";
import i18n from "i18n";
import Cookies from 'js-cookie'

export default class Comparison extends React.Component {
  constructor(props) {
    super(props);
    this.serviceStart = this.serviceStart.bind(this);
    this.serviceError = this.serviceError.bind(this);
    this.togglePage = this.togglePage.bind(this);
    this.receiveCategory = this.receiveCategory.bind(this);
    this.categoryKey = this.props.match.params.category;
    this.orderProducts = this.orderProducts.bind(this);
    this.setEmail = this.setEmail.bind(this)

    const {key1, key2} = this.props.match.params;
    const categoryName = this.categoryKey.replace(/[\-\_]/ig, ' ').capitalize();
    if (key1 && key2) {
      this.firstKey = key1;
      this.secondKey = key2;
      const key1Text = this.firstKey.replace(/[\-\_]/ig, ' ').capitalize();
      const key2Text = this.secondKey.replace(/[\-\_]/ig, ' ').capitalize();
      document.title = i18n.formatString(i18n.comparisons.seoTitleH2H, key1Text, key2Text, categoryName);
      $('meta[name=description]').attr('content', i18n.formatString(i18n.comparisons.seoDescriptionH2H, key1Text, key2Text, categoryName));
      CategoryActions.loadCategoryAndProducts(this.categoryKey, undefined, [key1, key2]);
      this.head2Head = true;
    } else {
      const query = Helpers.getQueryParams();
      Helpers.setDynamicSEOSettings('comparisons',
                                    this.categoryKey,
                                    i18n.formatString(i18n.comparisons.seoTitle, categoryName),
                                    i18n.formatString(i18n.comparisons.seoDescription, categoryName));
      CategoryActions.loadCategoryAndProducts(this.categoryKey, undefined, query['keys[]']);
      this.head2Head = false;
    }

    const selections = EngineStore.getEngineSelections();

    this.state = {
      email: selections['email'] || '',
      phone: selections['phone'] || '',
      hasUserData: (selections['email'] && selections['phone'] ? true : false ),
      products: [],
      categoryProductData: [],
      isLoading: true,
      loadingError: false,
      category: null,
      pages: 1,
      page: 1,
      pageSize: 2,
      prodColWidth: 4,
      showHiddenUI: false,
      otherProducts: []
    }
  }

  componentDidMount(){
    EngineStore.on("set-email-received", this.setEmail);
    CategoryStore.on("category-service-start", this.serviceStart);
    CategoryStore.on("category-service-error", this.serviceError);
    CategoryStore.on("category-received", this.receiveCategory);
    $(window).on('resize', debounce(() => {
      this.setView($(window).width());
    }, 500));
  }

  componentDidUpdate() {
    $('#infoForm').validator().on('submit', e => {
      this.submitEmailHandler(e)
    })
  }

  componentWillUnmount() {
    $(window).off('resize');
    EngineStore.on("set-email-received", this.setEmail);
    CategoryStore.removeListener("category-service-start", this.serviceStart);
    CategoryStore.removeListener("category-service-error", this.serviceError);
    CategoryStore.removeListener("category-received", this.receiveCategory);
  }

  setEmail(){
    const selections = EngineStore.getEngineSelections();
    this.setState({
      hasUserData: (selections['email'] && selections['phone'] ? true : false )
    })
  }

  serviceStart() {
    this.setState({isLoading: true, loadingError: null});
  }

  serviceError() {
    const error = CategoryStore.getError();
    this.setState({isLoading: false, loadingError: error});
  }

  receiveCategory() {
    var {category, products} = CategoryStore.getCategory();
    if (category.comparison.features.length < 1) {
      window.location.href = UserStore.isSignedIn() ?`/dashboard/add/category/${category.key}`:`/marketplace/category/${category.key}`;
    }
    if (this.head2Head) {
      if (products.length < 2) {
        window.location.href = UserStore.isSignedIn() ?`/dashboard/add/category/${category.key}/comparison`:`/marketplace/category/${category.key}/comparison`;
      } else if (products[0].key !== this.firstKey) {
        products.reverse();
      }
    }

    products = products.filter((prod) => {
      return category.comparison.products.find((compProduct) => {
        return compProduct.key === prod.key && compProduct.active}) !== undefined;
    });

    var categoryProductData = [];
    products.forEach(s => {
      category.comparison.products.find((p) => {
        if (p.key === s.key && p.active) {
          categoryProductData.push(p)
        }
      })
    });

    const {pages, page, pageSize, prodColWidth} = this.calculateView(products.length, $(window).width());
    this.setState({
      category: category,
      products: products,
      categoryProductData: categoryProductData,
      isLoading: false,
      loadingError: null,
      pages,
      page,
      pageSize,
      prodColWidth
    }, () => {
      const prodKeys = category.products.map((prod) => {
        return prod.key;
      })
      setTimeout(() => {
        SolutionActions.loadSolutionsByKey(prodKeys);
      }, 10)
    });
  }

  calculateView(prodSize, screenWidth) {
    if (screenWidth < 768 || prodSize === 1) {
      return {pages: prodSize, page: 1,pageSize: 1,prodColWidth: 12};
    } else {
      switch (prodSize) {
        case 2:
          return {pages: 1,page: 1,pageSize: 2,prodColWidth: 6};
        case 3:
          return {pages: 1,page: 1,pageSize: 3,prodColWidth: 4};
        default:
          if (screenWidth > 1200) {
            return {pages: Math.ceil(prodSize/4),page: 1,pageSize: 3,prodColWidth: 4};
          } else {
            return {pages: Math.ceil(prodSize/3),page: 1,pageSize: 2,prodColWidth: 6};
          }
      }
    }
  }

  setView(width) {
    if (this.state.products.length > 0) {
      const {pages, page, pageSize, prodColWidth} = this.calculateView(this.state.products.length, width);
      this.setState({pages, page, pageSize, prodColWidth});
    }
  }

  getToggleText(pages, page) {
    return(
      <div class="product-toggle">
        { pages > 1 &&
          <div>
            {page !== 1 &&
              <i class="fas fa-caret-left" aria-hidden="true" onClick={this.togglePage.bind(this, page-1)}></i>
            }
            Page {page} of {pages}
            {page !== pages &&
              <i class="fas fa-caret-right" aria-hidden="true" onClick={this.togglePage.bind(this, page+1)}></i>
            }
          </div>
        }
      </div>
    )
  }

  togglePage(pageNum) {
    this.setState({page: pageNum});
  }

  paginate(array, page_size, page_number) {
    --page_number;
    return array.slice(page_number * page_size, (page_number + 1) * page_size);
  }

  orderProducts(products) {
    const order = [
      {sale_type: "RESELLER", order: 0},
      {sale_type: "AFFILIATE", order: 1},
      {sale_type: "INFORMATIONAL", order: 2}
    ]

    products = products.map(prod => {
      prod.order = order.find(entry => {
        return entry.sale_type === prod.sale_type
      }).order;
      return prod;
    })

    return orderby(products, ['order', 'name'], ['asc', 'asc']);
  }

  sortAccordingToProds(catProds, prods) {
    return prods.map(prod => {
      return catProds.find(elem => {
        return elem.key === prod.key;
      })
    })
  }

  parseText(text) {
    var findUL = /(^[\*-]+ (.*)$)/gm;
    var findOL = /(^1 (.*)$)/gm;
    var found = false;
    var m;
    do {
      m = findUL.exec(text);
      if (m) {
        if (found) {
          text = text.replace(m[1], `<li>${m[2]}</li>`);

        } else {
          text = text.replace(m[1], `<ul><li>${m[2]}</li>`);
        }
        found = true;
      }
    } while(m);
    if (found) {
      text = text.replaceLast('</li>', '</li></ul>');
    } else {
      do {
        m = findOL.exec(text);
        if (m) {
          if (found) {
            text = text.replace(m[1], `<li>${m[2]}</li>`);
          } else {
            text = text.replace(m[1], `<ol><li>${m[2]}</li>`);
          }
          found = true;
        }
      } while(m);
      if (found) {
        text = text.replaceLast('</li>', '</li></ol>');
      }
    }

    return <div dangerouslySetInnerHTML={{ __html: text }} />
  }

  submitEmailHandler(e){
    if (!e.isDefaultPrevented()) {
      e.preventDefault();
      const brandSettings = Helpers.getBrandSettings();
      const data = {
        phone: this.state.phone,
        email: this.state.email,
        brand: brandSettings ? brandSettings.key : null,
        products: this.state.products.map(p=>{return p.name}),
        hs_context: Cookies.getJSON('hubspotutk'),
        uri: window.location.href
      }
      EngineActions.submitEmail(data)
    }
  }

  onChange(e) {
    this.setState({ [e.target.name]: e.target.value })
  }

  render() {
    const {category, categoryProductData, pages, page, pageSize, cueManagedHighlight, prodColWidth, loadingError, isLoading, email, phone, hasUserData} = this.state,
      otherProducts = category?category.products:[],
      products = this.orderProducts(this.state.products),
      activeProds = products.length > 0 ? this.paginate(products, pageSize, page) : [],
      sortedCatProdData = this.sortAccordingToProds(categoryProductData, products),
      activeCategoryProductData = sortedCatProdData.length > 0 ? this.paginate(sortedCatProdData, pageSize, page) : [],
      supportPhone = Helpers.getSupportPhone();
    const  value = products.map(prod =>{return prod.key})
    return (
      <div class={"comparison-wrap" + (products.length > 2 ? " shrink-text":"")}>
        { loadingError ?
          <LoadingError />
        : isLoading || category.comparison.features.length < 1 ?
            <Loading />
          :
            <div>
              <div class="marketplace-header">
                <div class="marketplace-header-pane">
                  { this.head2Head ?
                    <div>
                      <h1 class="header-text">{products[0].name} • vs • {products[1].name}</h1>
                      <div class="header-desc">
                        {i18n.formatString(i18n.comparisons.headerH2H, products[0].name, products[1].name)}
                        <br/>
                        <Link class="yellow" to={UserStore.isSignedIn() ? `/dashboard/add/category/${category.key}`: `/marketplace/category/${category.key}`}>{i18n.formatString(i18n.comparisons.headerH2HClick, category.name.toLowerCase())}.</Link>
                      </div>
                    </div>
                    :
                    <div>
                      <h1 class="header-text">
                        {i18n.formatString(i18n.comparisons.headerCatTitle, category.name.toLowerCase())}
                      </h1>
                      <div class="header-desc">
                        {i18n.formatString(i18n.comparisons.headerCatDesc, category.name.toLowerCase())}
                      </div>
                    </div>
                  }
                  <div class="top-toggle">
                    {this.getToggleText(pages, page)}
                  </div>
                </div>
              </div>
              <div class="marketplace-body">
                <div class="comparison-main">

                  <div class="products-col">
                    <TableHeader
                      products={activeProds}
                      colWidth={prodColWidth}
                      addVendorLog={this.addVendorLog}
                    />


                    <div class='section-header'>
                      Included Features
                    </div>

                      <ComparisonDataRows
                        category={category}
                        products={activeProds}
                        catProdData={activeCategoryProductData}
                        colWidth={prodColWidth}
                      />

                      {
                        !hasUserData?
                          <div class='section-header email'>
                            Enter your email and phone number to get access to unique features, support, pricing, expert views and more.
                            <form id="infoForm" role="form" data-toggle="validator">
                              <div class="form-group">
                                <input type="text" value={email} onChange={this.onChange.bind(this)} placeholder="Email" required pattern="^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$" class="form-control" name="email" data-error="A valid email is required" />
                                <div class="help-block with-errors"></div>
                              </div>
                              <div class="form-group">
                                <input type="text" value={phone} onChange={this.onChange.bind(this)} placeholder="Phone Number" required data-minlength="10"  class="form-control" name="phone" data-error="A valid phone number is required" />
                                <div class="help-block with-errors"></div>
                              </div>
                              <button class="btn btn-cue" type="submit">Submit Email</button>
                            </form>
                          </div>
                        :
                          null
                      }

                      <div class={'section-header'}>
                        Platforms
                      </div>

                      <div class={hasUserData ? "" : "email-wrap-blur"}>

                      <ProductDataRows
                        dataType={"platforms"}
                        products={activeProds}
                        colWidth={prodColWidth}
                      />

                      <div class={'section-header'}>
                        Support
                      </div>

                      <ProductDataRows
                        dataType={"support"}
                        products={activeProds}
                        colWidth={prodColWidth}
                      />

                      <div class={'section-header'}>
                        Pricing
                      </div>

                      <ProductDataRows
                        dataType={"pricing"}
                        products={activeProds}
                        colWidth={prodColWidth}
                      />

                      <div class={'section-header'}>
                        Integrations & Unique Features
                      </div>

                      <AdditionalInfoRows
                        products={activeProds}
                        dataType={"Integrations"}
                        categoryProductData={activeCategoryProductData}
                        colWidth={prodColWidth}
                      />

                      <AdditionalInfoRows
                        products={activeProds}
                        dataType={"Unique Features"}
                        categoryProductData={activeCategoryProductData}
                        colWidth={prodColWidth}
                      />

                      <div class={'section-header'}>
                        CUE Insights
                      </div>

                      <Insights
                        products={activeProds}
                        colWidth={prodColWidth}
                      />

                      <div class="row">
                        {
                          activeProds.map((product, key) => {
                            return (
                              <div key={key} class={"col-xs-" + prodColWidth}>
                                <div class="product-col bottom">
                                  <ProductLink product={product} />
                                </div>
                              </div>
                            )
                          })
                        }
                      </div>

                    </div>{/* closing div blur pane */}
                  </div>
                  <div class="info-col">
                    <div class="side-toggle">
                      {this.getToggleText(pages, page)}
                    </div>

                    <h3>{i18n.comparisons.whatTitle}</h3>
                    <div class="info-col-text">
                      {i18n.comparisons.whatDesc}
                    </div>
                    <Link class="managed-link"
                    to={UserStore.isSignedIn() ? `/dashboard/add/category/cue-managed}` : `/marketplace/category/cue-managed`}>Click here to view all {i18n.categories.managed} Products</Link>

                    <div class="call-us dark top-spacing">
                      Or call us at <a href={`tel:${supportPhone}`}>{supportPhone}</a> and we'll help you get started.
                    </div>

                    {
                      this.head2Head && products.length > 0 &&
                        <OtherProducts
                          catName={category.name}
                          products={otherProducts}
                          key1={this.firstKey}
                          key2={this.secondKey}
                          orderProducts={this.orderProducts}
                        />
                    }
                  </div>
                </div>

                {
                  category.article_title && category.article_text &&
                  <div class="category-article">
                    <h3>{category.article_title}</h3>
                    {this.parseText(category.article_text)}
                    <div class="expert-line">
                      <div class="expert-details">
                        <img class="round-thumb" src="https://d3jz5yl8ad4hn8.cloudfront.net/img/expert/thumbs/dhanashree.png"/>
                        <small>Dhanashree, PM &amp; CUE Expert</small>
                      </div>
                      <img class="cue-insights" src={Settings.assetsServer+"/img/cue_insights_logo.svg"} alt="CUE Insights"/>
                    </div>
                  </div>
                }
              </div>
            </div>
        }
      </div>
    )
  }
}