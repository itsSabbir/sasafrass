/* Job: load_fact_widget_summary — daily widget rollup */

/* Step: EXT_WIDGET_ORDERS (Extract) — Pull active widget orders
   Note: 01-May-2026
   Pull only active orders from the last 30 days. */

LIBNAME srcdb TERADATA SERVER="src.example.com" SCHEMA=PUBLIC;

%let SYSLAST = %nrquote(srcdb.widget_orders);

proc sql;
   create table work.EXT_WIDGET_ORDERS as
      select
         order_id,
         widget_id,
         customer_id,
         /* keep only active orders */
         order_status,
         order_date
   from &SYSLAST
      where order_status = 'ACTIVE'
        and order_date > today() - 30
   ;
quit;

%let SYSLAST = work.EXT_WIDGET_ORDERS;

/* Step: JOIN_WITH_LOOKUP (Join)
   Warning: Column widget_name truncated to 50 chars. */

%let SYSLAST = %nrquote(work.EXT_WIDGET_ORDERS);

proc sql;
   create table work.JOINED_WIDGETS as
   select
      o.order_id,
      o.widget_id,
      o.customer_id,
      l.widget_name length = 50 label = 'widget_name',
      l.widget_category,
      o.order_date
   from
      work.EXT_WIDGET_ORDERS as o
   left join
      srcdb.widget_lookup as l
      on o.widget_id = l.widget_id
   ;
quit;

%let SYSLAST = work.JOINED_WIDGETS;

/* Step: LOAD_TARGET (Loader) — Append to fact_widget_summary */

%macro etls_loader;
   %let etls_lastTable = &SYSLAST;
   proc append base = tgtdb.fact_widget_summary
               data = &etls_lastTable force;
   run;
   %rcSet(&syserr);
%mend etls_loader;
%etls_loader;