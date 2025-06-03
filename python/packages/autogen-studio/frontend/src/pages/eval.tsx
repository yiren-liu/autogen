import * as React from "react";
import Layout from "../components/layout";
import { graphql } from "gatsby";
import EvalScope from "../components/views/teambuilder/eval";

// markup
const IndexPage = ({ data }: any) => {
  return (
    <Layout meta={data.site.siteMetadata} title="Home" link={"/eval"}>
      <main style={{ height: "100%" }} className=" h-full ">
        <EvalScope />
      </main>
    </Layout>
  );
};

export const query = graphql`
  query HomePageQuery {
    site {
      siteMetadata {
        description
        title
      }
    }
  }
`;

export default IndexPage;
