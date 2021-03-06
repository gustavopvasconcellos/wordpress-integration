/* eslint-disable @typescript-eslint/camelcase */
import { Container } from 'vtex.store-components'

import React, { FunctionComponent, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { defineMessages } from 'react-intl'
import { useQuery } from 'react-apollo'
import { useRuntime } from 'vtex.render-runtime'
import { Spinner } from 'vtex.styleguide'
import insane from 'insane'
import { useCssHandles } from 'vtex.css-handles'

import SinglePageBySlug from '../graphql/SinglePageBySlug.graphql'
import Settings from '../graphql/Settings.graphql'

interface PageProps {
  customDomains: string
}

const sanitizerConfig = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'p',
    'a',
    'ul',
    'ol',
    'nl',
    'li',
    'b',
    'i',
    'strong',
    'section',
    'em',
    'strike',
    'code',
    'hr',
    'br',
    'div',
    'table',
    'thead',
    'caption',
    'tbody',
    'tr',
    'th',
    'td',
    'pre',
    'img',
    'iframe',
    'figure',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target'],
    img: ['src', 'alt'],
    iframe: ['src', 'scrolling', 'frameborder', 'width', 'height', 'id'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
}

const sanitizerConfigStripAll = {
  allowedAttributes: false,
  allowedTags: false,
  allowedSchemes: [],
}

const CSS_HANDLES = [
  'postFlex',
  'postContainer',
  'postTitle',
  'postMeta',
  'postFeaturedImage',
  'postBody',
  'postChildrenContainer',
] as const

const WordpressPageInner: FunctionComponent<{ pageData: any }> = props => {
  const handles = useCssHandles(CSS_HANDLES)
  const { loading: loadingS, data: dataS } = useQuery(Settings)

  if (!props.pageData) {
    return (
      <div className={`${handles.postContainer} ph3`}>
        <h2>No page found.</h2>
      </div>
    )
  }

  const {
    date,
    title,
    content,
    author,
    excerpt,
    featured_media,
  } = props.pageData

  const dateObj = new Date(date)
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' }
  const formattedDate = dateObj.toLocaleDateString('en-US', dateOptions)

  const titleHtml = useMemo(() => {
    return insane(title.rendered, sanitizerConfig)
  }, [title.rendered, sanitizerConfig])
  const captionHtml = useMemo(() => {
    return featured_media?.caption?.rendered
      ? insane(featured_media.caption.rendered, sanitizerConfigStripAll)
      : null
  }, [featured_media?.caption?.rendered, sanitizerConfigStripAll])
  const bodyHtml = useMemo(() => {
    return insane(content.rendered, sanitizerConfig)
  }, [content.rendered, sanitizerConfig])

  if (loadingS) {
    return (
      <div className="mv5 flex justify-center" style={{ minHeight: 800 }}>
        <Spinner />
      </div>
    )
  }
  return (
    <Container className={`${handles.postFlex} pt6 pb8 ph3`}>
      <Helmet>
        <title>
          {dataS?.appSettings?.titleTag
            ? `${title.rendered} | ${dataS.appSettings.titleTag}`
            : title.rendered}
        </title>
        {featured_media?.media_type === 'image' &&
        featured_media?.source_url ? (
          <meta property="og:image" content={featured_media?.source_url} />
        ) : (
          ''
        )}
        <meta
          name="description"
          content={excerpt?.rendered
            ?.replace(/<p>/gi, '')
            .replace(/<\/p>/gi, '')
            .trim()}
        />
      </Helmet>
      <div className={`${handles.postContainer} ph3`}>
        <h1
          className={`${handles.postTitle} t-heading-1`}
          dangerouslySetInnerHTML={{ __html: titleHtml }}
        />
        <p className={`${handles.postMeta} t-small mw9 c-muted-1`}>
          <span>Posted {formattedDate} </span>
          {author && <span> by {author.name}</span>}
        </p>
        {featured_media && featured_media.media_type === 'image' && (
          <div className="mw9 pb8">
            <img
              className={`${handles.postFeaturedImage}`}
              src={featured_media.source_url}
              alt={featured_media.alt_text}
            />
            {captionHtml && (
              <span dangerouslySetInnerHTML={{ __html: captionHtml }} />
            )}
          </div>
        )}
        <div
          className={`${handles.postBody}`}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </Container>
  )
}

const WordpressPage: StorefrontFunctionComponent<PageProps> = ({
  customDomains,
}) => {
  const {
    route: { params },
  } = useRuntime()

  let parsedCustomDomains = null
  try {
    parsedCustomDomains = customDomains ? JSON.parse(customDomains) : null
  } catch (e) {
    console.error(e)
  }

  const customDomain =
    params.customdomainslug && parsedCustomDomains
      ? parsedCustomDomains[params.customdomainslug]
      : undefined

  const { loading, error, data } = useQuery(SinglePageBySlug, {
    variables: { slug: params.slug, customDomain },
  })

  if (loading) {
    return (
      <div className="mv5 flex justify-center" style={{ minHeight: 800 }}>
        <Spinner />
      </div>
    )
  }
  if (error) {
    return (
      <div className="ph5" style={{ minHeight: 800 }}>
        Error! {error.message}
      </div>
    )
  }
  if (!data?.wpPages?.pages) {
    return (
      <div>
        <h2>No page found.</h2>
      </div>
    )
  }
  return <WordpressPageInner pageData={data.wpPages.pages[0]} />
}

const messages = defineMessages({
  title: {
    defaultMessage: '',
    id: 'admin/editor.wordpressPage.title',
  },
  description: {
    defaultMessage: '',
    id: 'admin/editor.wordpressPage.description',
  },
  customDomainsTitle: {
    defaultMessage: '',
    id: 'admin/editor.wordpressCustomDomains.title',
  },
  customDomainsDescription: {
    defaultMessage: '',
    id: 'admin/editor.wordpressCustomDomains.description',
  },
})

WordpressPage.defaultProps = {
  customDomains: undefined,
}

WordpressPage.schema = {
  title: messages.title.id,
  description: messages.description.id,
  type: 'object',
  properties: {
    customDomains: {
      title: messages.customDomainsTitle.id,
      description: messages.customDomainsDescription.id,
      type: 'string',
      isLayout: false,
      default: '',
    },
  },
}

export default WordpressPage
