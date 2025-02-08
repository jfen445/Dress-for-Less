export const POSTS_QUERY = `*[_type == "post" && defined(slug.current)][0...12]{
  _id, title, slug
}`;

export const POST_QUERY = `*[_type == "faq"]{
      _id,
      question,
      answer,
    }`;
